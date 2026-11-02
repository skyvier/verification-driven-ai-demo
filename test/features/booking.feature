Feature: Reserve one meeting room
  Intervals include their start and exclude their end.

  Scenario: An available interval can be booked
    When I book "first" from 60 to 120
    Then the result is "booked"

  Scenario: Overlapping intervals cannot both be booked
    Given booking "first" from 60 to 120 exists
    When I book "second" from 90 to 150
    Then the result is "conflict"

  Scenario: Adjacent intervals are available
    Given booking "first" from 60 to 120 exists
    When I book "second" from 120 to 150
    Then the result is "booked"

  Scenario: Cancelling releases the interval
    Given booking "first" from 60 to 120 exists
    When I cancel "first"
    Then the result is "cancelled"
    When I book "second" from 60 to 120
    Then the result is "booked"

  Scenario: An empty interval is invalid
    When I book "first" from 60 to 60
    Then the result is "invalid"

  Scenario: Booking identifiers are unique
    Given booking "first" from 60 to 120 exists
    When I book "first" from 180 to 240
    Then the result is "duplicate-id"
