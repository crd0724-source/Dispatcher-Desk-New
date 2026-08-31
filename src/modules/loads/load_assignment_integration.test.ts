/**
 * DispatcherDesk S6.4 Dispatch Assignment Integration Verification Tests
 *
 * Tests:
 * 1. Truck assignment through browser save (updateLoad)
 * 2. Driver assignment through browser save (updateLoad)
 * 3. Assignment removal (updateLoad with null truck/driver)
 * 4. Non-assignment load update still works (rate, commodity, origin)
 * 5. No duplicate assignment activity notes
 * 6. S6.4 Integrity enforcement (client alignment, inactive/maintenance, off-duty, schedule overlaps, invoiced immutability)
 */

// Polyfill localStorage for Node test runner if needed
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => { store.set(key, String(value)); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (index: number) => Array.from(store.keys())[index] || null,
    length: 0,
  } as Storage;
}

import { loadService } from './loadService.ts';
import { clientService } from '../clients/clientService.ts';
import { truckService } from '../trucks/truckService.ts';
import { driverService } from '../drivers/driverService.ts';
import { activityService } from '../activity/activityService.ts';
import { deriveLoadScheduleFromInputs, parseDateAndTimeToInputs, constructIsoDatetime } from './LoadModal.tsx';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ PASS: ${message}`);
}

async function runTests() {
  console.log('===============================================================');
  console.log('RUNNING S6.4 DISPATCH ASSIGNMENT INTEGRATION TEST SUITE');
  console.log('===============================================================\n');

  const testOrgId = 'test-org-s6-4-' + Date.now();

  // Initialize test dependencies
  const clients = await clientService.getClients(testOrgId);
  const targetClient = clients[0];
  const otherClient = clients[1];

  const allTrucks = await truckService.getTrucks(testOrgId);
  const clientTrucks = allTrucks.filter((t) => t.client_id === targetClient.id && t.status === 'active');
  const targetTruck1 = clientTrucks[0];
  const targetTruck2 = clientTrucks[1] || clientTrucks[0];

  const allDrivers = await driverService.getDrivers(testOrgId);
  const clientDrivers = allDrivers.filter((d) => d.client_id === targetClient.id && d.status === 'available');
  const targetDriver1 = clientDrivers[0];
  const targetDriver2 = clientDrivers[1] || clientDrivers[0];

  console.log(`Setting up base test load for client: ${targetClient.company_name}`);

  // Create an initial unassigned load
  const createdLoad = await loadService.createLoad(testOrgId, {
    load_number: `LD-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
    client_id: targetClient.id,
    origin_city: 'Dallas',
    origin_state: 'TX',
    dest_city: 'Atlanta',
    dest_state: 'GA',
    rate: 2500,
    loaded_miles: 780,
    equipment_type: 'dry_van',
    pipeline_status: 'sourced',
  });

  assert(createdLoad.id !== undefined, 'Load created successfully');
  assert(createdLoad.truck_id === null, 'Initial load has no assigned truck');
  assert(createdLoad.driver_id === null, 'Initial load has no assigned driver');

  const loadId = createdLoad.id;

  // -------------------------------------------------------------
  // TEST 1: Truck assignment through browser save (updateLoad)
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: Truck assignment through browser save ---');
  const updatedWithTruck = await loadService.updateLoad(testOrgId, loadId, {
    truck_id: targetTruck1.id,
  });

  assert(updatedWithTruck.truck_id === targetTruck1.id, 'Truck ID successfully assigned on load');
  assert(updatedWithTruck.truck?.id === targetTruck1.id, 'Truck relation properly joined');

  // Verify activity note created
  const notesAfterTruck = await activityService.getActivities(testOrgId, loadId);
  const truckAssignNotes = notesAfterTruck.filter((n) => n.type === 'assignment_change');
  assert(truckAssignNotes.length >= 1, 'Assignment activity note recorded for truck assignment');
  assert(notesAfterTruck[0].type === 'assignment_change', 'Most recent activity note has note_type = "assignment_change"');
  assert(notesAfterTruck[0].type !== ('general' as any), 'Activity note is NOT "general"');
  assert(truckAssignNotes[0].metadata?.newTruckId === targetTruck1.id, 'Activity note metadata contains correct truck ID');

  // -------------------------------------------------------------
  // TEST 2: Driver assignment through browser save (updateLoad)
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Driver assignment through browser save ---');
  const noteCountBeforeDriver = (await activityService.getActivities(testOrgId, loadId)).filter((n) => n.type === 'assignment_change').length;

  const updatedWithDriver = await loadService.updateLoad(testOrgId, loadId, {
    driver_id: targetDriver1.id,
  });

  assert(updatedWithDriver.driver_id === targetDriver1.id, 'Driver ID successfully assigned on load');
  assert(updatedWithDriver.truck_id === targetTruck1.id, 'Existing truck assignment preserved');
  assert(updatedWithDriver.driver?.id === targetDriver1.id, 'Driver relation properly joined');

  const notesAfterDriver = await activityService.getActivities(testOrgId, loadId);
  const noteCountAfterDriver = notesAfterDriver.filter((n) => n.type === 'assignment_change').length;
  assert(noteCountAfterDriver === noteCountBeforeDriver + 1, 'Exactly one new assignment activity note recorded for driver assignment');
  assert(notesAfterDriver[0].type === 'assignment_change', 'New driver assignment note has note_type = "assignment_change"');
  assert(notesAfterDriver[0].type !== ('general' as any), 'Driver assignment note is NOT "general"');
  assert(notesAfterDriver[0].metadata?.newDriverId === targetDriver1.id, 'Driver assignment metadata contains new driver ID');

  // -------------------------------------------------------------
  // TEST 3: Non-assignment load update still works
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Non-assignment load update still works ---');
  const totalNotesBeforeNonAssign = (await activityService.getActivities(testOrgId, loadId)).length;
  const noteCountBeforeNonAssign = (await activityService.getActivities(testOrgId, loadId)).filter((n) => n.type === 'assignment_change').length;

  const updatedDetails = await loadService.updateLoad(testOrgId, loadId, {
    rate: 3200,
    commodity: 'High-Value Solar Electronics',
    origin_city: 'Fort Worth',
    dest_city: 'Savannah',
  });

  assert(updatedDetails.rate === 3200, 'Rate successfully updated to 3200');
  assert(updatedDetails.commodity === 'High-Value Solar Electronics', 'Commodity successfully updated');
  assert(updatedDetails.origin_city === 'Fort Worth', 'Origin city successfully updated');
  assert(updatedDetails.dest_city === 'Savannah', 'Destination city successfully updated');
  assert(updatedDetails.truck_id === targetTruck1.id, 'Truck assignment preserved during non-assignment update');
  assert(updatedDetails.driver_id === targetDriver1.id, 'Driver assignment preserved during non-assignment update');

  // -------------------------------------------------------------
  // TEST 4: No duplicate assignment activity note on non-assignment update
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: No duplicate assignment activity note ---');
  const totalNotesAfterNonAssign = (await activityService.getActivities(testOrgId, loadId)).length;
  const noteCountAfterNonAssign = (await activityService.getActivities(testOrgId, loadId)).filter((n) => n.type === 'assignment_change').length;
  assert(noteCountAfterNonAssign === noteCountBeforeNonAssign, 'Zero duplicate assignment activity notes generated on non-assignment update');
  assert(totalNotesAfterNonAssign === totalNotesBeforeNonAssign, 'Zero general or duplicate notes created on non-assignment update');

  // Also verify that updating with unchanged truck_id and driver_id does NOT generate an assignment note
  const updatedSameAssignments = await loadService.updateLoad(testOrgId, loadId, {
    truck_id: targetTruck1.id,
    driver_id: targetDriver1.id,
    rate: 3300,
  });
  assert(updatedSameAssignments.rate === 3300, 'Rate updated to 3300');
  const noteCountAfterSameAssign = (await activityService.getActivities(testOrgId, loadId)).filter((n) => n.type === 'assignment_change').length;
  assert(noteCountAfterSameAssign === noteCountBeforeNonAssign, 'Zero duplicate assignment activity notes generated when assigning identical truck/driver');

  // -------------------------------------------------------------
  // TEST 5: Assignment removal (unassign truck and driver)
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Assignment removal ---');
  const noteCountBeforeRemoval = (await activityService.getActivities(testOrgId, loadId)).filter((n) => n.type === 'assignment_change').length;

  const unassignedLoad = await loadService.updateLoad(testOrgId, loadId, {
    truck_id: null,
    driver_id: null,
  });

  assert(unassignedLoad.truck_id === null, 'Truck ID is now null (unassigned)');
  assert(unassignedLoad.driver_id === null, 'Driver ID is now null (unassigned)');
  assert(unassignedLoad.truck === null || unassignedLoad.truck === undefined, 'Truck relation unlinked');
  assert(unassignedLoad.driver === null || unassignedLoad.driver === undefined, 'Driver relation unlinked');

  const notesAfterRemoval = await activityService.getActivities(testOrgId, loadId);
  const noteCountAfterRemoval = notesAfterRemoval.filter((n) => n.type === 'assignment_change').length;
  assert(noteCountAfterRemoval === noteCountBeforeRemoval + 1, 'Exactly one assignment activity note recorded for unassignment');
  assert(notesAfterRemoval[0].type === 'assignment_change', 'Unassignment note has exact note_type = "assignment_change"');
  assert(notesAfterRemoval[0].type !== ('general' as any), 'Unassignment note is NOT "general"');
  assert(notesAfterRemoval[0].metadata?.newTruckId === null, 'Unassignment metadata has newTruckId = null');
  assert(notesAfterRemoval[0].metadata?.newDriverId === null, 'Unassignment metadata has newDriverId = null');

  // -------------------------------------------------------------
  // TEST 6: S6.4 Integrity enforcement (Wrong client, Inactive, Overlaps, Invoiced)
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: S6.4 Integrity enforcement tests ---');

  // 6a: Wrong client truck rejection
  const otherClientTruck = allTrucks.find((t) => t.client_id === otherClient.id);
  if (otherClientTruck) {
    let errCaught = false;
    try {
      await loadService.updateLoad(testOrgId, loadId, {
        truck_id: otherClientTruck.id,
      });
    } catch (e: any) {
      errCaught = true;
      assert(e.message.includes('Client') || e.message.includes('client'), `Wrong client truck assignment rejected with message: "${e.message}"`);
    }
    assert(errCaught, 'Wrong client truck assignment correctly threw an error');
  }

  // 6b: Maintenance truck on active load rejection
  // Create a load in 'booked' status directly
  const bookedLoad = await loadService.createLoad(testOrgId, {
    load_number: `LD-BKD-${Math.floor(1000 + Math.random() * 9000)}`,
    client_id: targetClient.id,
    origin_city: 'Houston',
    origin_state: 'TX',
    dest_city: 'Chicago',
    dest_state: 'IL',
    rate: 4200,
    loaded_miles: 1050,
    equipment_type: 'dry_van',
    pipeline_status: 'booked',
  });

  const maintenanceTruck = allTrucks.find((t) => t.client_id === targetClient.id && t.status === 'maintenance') || {
    ...targetTruck1,
    id: 'maint-truck-test-' + Date.now(),
    status: 'maintenance' as const,
  };

  // Add maintenance truck to storage if not already present
  if (!allTrucks.some((t) => t.id === maintenanceTruck.id)) {
    const trucksKey = `dispatchdesk_demo_trucks_${testOrgId}`;
    const curTrucks = await truckService.getTrucks(testOrgId);
    curTrucks.push(maintenanceTruck as any);
    localStorage.setItem(trucksKey, JSON.stringify(curTrucks));
  }

  let maintErrCaught = false;
  try {
    await loadService.updateLoad(testOrgId, bookedLoad.id, {
      truck_id: maintenanceTruck.id,
    });
  } catch (e: any) {
    maintErrCaught = true;
    assert(e.message.includes('maintenance'), `Maintenance truck assignment on booked load rejected with: "${e.message}"`);
  }
  assert(maintErrCaught, 'Maintenance truck assignment on booked load correctly rejected');

  // 6c: Invoiced load immutability
  // Create load directly in 'invoiced' status
  const invoicedLoad = await loadService.createLoad(testOrgId, {
    load_number: `LD-INV-${Math.floor(1000 + Math.random() * 9000)}`,
    client_id: targetClient.id,
    origin_city: 'Austin',
    origin_state: 'TX',
    dest_city: 'Miami',
    dest_state: 'FL',
    rate: 5000,
    loaded_miles: 1300,
    equipment_type: 'dry_van',
    pipeline_status: 'invoiced',
  });

  let invoicedErrCaught = false;
  try {
    await loadService.updateLoad(testOrgId, invoicedLoad.id, {
      truck_id: targetTruck1.id,
    });
  } catch (e: any) {
    invoicedErrCaught = true;
    assert(e.message.includes('INVOICED') || e.message.includes('invoiced') || e.message.includes('Integrity Error'), `Assignment modification on INVOICED load rejected with: "${e.message}"`);
  }
  assert(invoicedErrCaught, 'Assignment on invoiced load correctly rejected');

  // -------------------------------------------------------------
  // TEST 7: UI DateTime state synchronization & schedule conflict resolution
  // Verifies that when a load with an overlapping schedule (e.g. Sep 1 08:00 -> Sep 4 18:00)
  // is updated in the UI selectors to Sep 10 02:30 -> Sep 11 13:00:
  // 1. The submitted payload is derived directly from the current selectors (Sep 10 02:30 / Sep 11 13:00)
  // 2. No stale datetime (Sep 1 - Sep 4) is submitted
  // 3. The update and truck assignment succeeds without conflict error
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: UI DateTime state synchronization & schedule conflict resolution ---');

  // Create an active load on targetTruck1 spanning Sep 1 to Sep 4
  const conflictingLoad1 = await loadService.createLoad(testOrgId, {
    load_number: `LD-CONF1-${Math.floor(1000 + Math.random() * 9000)}`,
    client_id: targetClient.id,
    truck_id: targetTruck1.id,
    origin_city: 'Dallas',
    origin_state: 'TX',
    dest_city: 'Atlanta',
    dest_state: 'GA',
    rate: 3000,
    loaded_miles: 800,
    equipment_type: 'dry_van',
    pipeline_status: 'booked',
    pickup_datetime: new Date(2026, 8, 1, 8, 0, 0).toISOString(), // Sep 1, 2026 08:00
    delivery_datetime: new Date(2026, 8, 4, 18, 0, 0).toISOString(), // Sep 4, 2026 18:00
  });

  // Create a second load initially configured with the exact same Sep 1 -> Sep 4 schedule in 'booked' status (unassigned)
  const loadToReschedule = await loadService.createLoad(testOrgId, {
    load_number: `LD-RESCHED-${Math.floor(1000 + Math.random() * 9000)}`,
    client_id: targetClient.id,
    origin_city: 'Fort Worth',
    origin_state: 'TX',
    dest_city: 'Savannah',
    dest_state: 'GA',
    rate: 3200,
    loaded_miles: 850,
    equipment_type: 'dry_van',
    pipeline_status: 'booked',
    pickup_datetime: conflictingLoad1.pickup_datetime,
    delivery_datetime: conflictingLoad1.delivery_datetime,
  });

  // 7a: Parsing existing load schedule into UI selector state
  const initialPickupParsed = parseDateAndTimeToInputs(loadToReschedule.pickup_datetime);
  const initialDeliveryParsed = parseDateAndTimeToInputs(loadToReschedule.delivery_datetime);
  assert(initialPickupParsed.date.includes('2026-09-01') || initialPickupParsed.date === '2026-09-01', 'Initial pickup date correctly parsed into UI state');

  // Attempting to assign targetTruck1 with conflicting schedule fails as expected
  let scheduleConflictCaught = false;
  try {
    await loadService.updateLoad(testOrgId, loadToReschedule.id, {
      truck_id: targetTruck1.id,
      pipeline_status: 'booked',
      pickup_datetime: loadToReschedule.pickup_datetime,
      delivery_datetime: loadToReschedule.delivery_datetime,
    });
  } catch (e: any) {
    scheduleConflictCaught = true;
    assert(e.message.includes('overlaps') || e.message.includes('Conflict Error'), `Conflicting schedule correctly rejected: "${e.message}"`);
  }
  assert(scheduleConflictCaught, 'Attempting to assign truck with conflicting schedule was correctly caught');

  // 7b: Dispatcher adjusts the UI selectors to non-conflicting schedule (Sep 10 02:30 -> Sep 11 13:00)
  const activeUiSelectors = {
    pickupDate: '2026-09-10',
    pickupTime: '02:30',
    deliveryDate: '2026-09-11',
    deliveryTime: '13:00',
  };

  // Derive schedule payload directly from the active UI selector state
  const derivedSchedule = deriveLoadScheduleFromInputs(activeUiSelectors);
  assert(derivedSchedule.isValid, 'Derived schedule is marked valid');
  assert(derivedSchedule.pickup_datetime !== null, 'Derived pickup datetime is not null');
  assert(derivedSchedule.delivery_datetime !== null, 'Derived delivery datetime is not null');

  // Verify that the derived payload contains the exact expected dates/times and NO stale Sep 1 - Sep 4 datetime
  const expectedPickupIso = new Date(2026, 8, 10, 2, 30, 0, 0).toISOString();
  const expectedDeliveryIso = new Date(2026, 8, 11, 13, 0, 0, 0).toISOString();
  assert(derivedSchedule.pickup_datetime === expectedPickupIso, `Pickup datetime payload (${derivedSchedule.pickup_datetime}) matches active UI selector (Sep 10 02:30)`);
  assert(derivedSchedule.delivery_datetime === expectedDeliveryIso, `Delivery datetime payload (${derivedSchedule.delivery_datetime}) matches active UI selector (Sep 11 13:00)`);
  assert(derivedSchedule.pickup_datetime !== loadToReschedule.pickup_datetime, 'Submitted pickup datetime is NOT stale Sep 1');
  assert(derivedSchedule.delivery_datetime !== loadToReschedule.delivery_datetime, 'Submitted delivery datetime is NOT stale Sep 4');

  // 7c: Submitting the updated payload successfully updates the load and assigns targetTruck1 without overlap conflict
  const successfullyUpdatedLoad = await loadService.updateLoad(testOrgId, loadToReschedule.id, {
    truck_id: targetTruck1.id,
    pipeline_status: 'booked',
    pickup_datetime: derivedSchedule.pickup_datetime,
    delivery_datetime: derivedSchedule.delivery_datetime,
  });

  assert(successfullyUpdatedLoad.truck_id === targetTruck1.id, 'Truck successfully assigned after schedule update');
  assert(successfullyUpdatedLoad.pickup_datetime === expectedPickupIso, 'Load pickup_datetime persisted as Sep 10 02:30');
  assert(successfullyUpdatedLoad.delivery_datetime === expectedDeliveryIso, 'Load delivery_datetime persisted as Sep 11 13:00');
  assert(successfullyUpdatedLoad.pipeline_status === 'booked', 'Load status updated to booked');

  console.log('\n===============================================================');
  console.log('✅ ALL S6.4 DISPATCH ASSIGNMENT INTEGRATION TESTS PASSED');
  console.log('===============================================================\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  throw err;
});
