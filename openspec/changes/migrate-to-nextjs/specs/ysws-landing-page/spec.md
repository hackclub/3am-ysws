## ADDED Requirements

### Requirement: Mobile Navigation Toggle
The system SHALL provide a hamburger control that toggles the mobile nav-links open/closed, and closes it when any nav link is clicked, matching current behavior.

#### Scenario: Toggle opens and closes menu
- **WHEN** a user clicks the hamburger button
- **THEN** the nav-links panel toggles its open state

#### Scenario: Clicking a link closes the menu
- **WHEN** a user clicks a link inside the open nav-links panel
- **THEN** the panel closes

### Requirement: FAQ Accordion
The system SHALL allow only one FAQ item to be open at a time; clicking an open item's toggle closes it, and clicking a closed item's toggle opens it while closing any other open item.

#### Scenario: Opening one item closes another
- **WHEN** a user clicks a closed FAQ item while a different FAQ item is open
- **THEN** the previously open item closes and the clicked item opens

#### Scenario: Closing the open item
- **WHEN** a user clicks the currently open FAQ item
- **THEN** it closes and no item remains open

### Requirement: Hero Star Canvas
The system SHALL render an animated star field on a canvas inside the hero section, with stars twinkling over time, resizing to the hero's dimensions on window resize, and drawing connecting lines between stars near the mouse cursor.

#### Scenario: Canvas resizes with viewport
- **WHEN** the browser window is resized
- **THEN** the canvas dimensions and star count update to match the hero section's new size

#### Scenario: Mouse proximity draws connections
- **WHEN** the mouse moves within the hero section near multiple stars
- **THEN** lines are drawn between nearby stars, fading based on distance

#### Scenario: Mouse leaves hero
- **WHEN** the mouse leaves the hero section
- **THEN** no proximity connections are drawn

### Requirement: Fog Layer
The system SHALL render a fixed set of drifting fog-cloud elements inside the hero's fog layer, positioned and animated with the same size/position/timing/opacity values as the current implementation.

#### Scenario: Fog clouds present on load
- **WHEN** the hero section renders
- **THEN** three fog-cloud elements are present with drift animation applied via CSS custom properties

### Requirement: Typewriter Hero Subtitle
The system SHALL cycle the hero subtitle through a fixed list of phrases, typing each character-by-character, pausing, then deleting character-by-character before moving to the next phrase, looping indefinitely.

#### Scenario: Phrase typing and deleting
- **WHEN** the hero subtitle animation is running
- **THEN** it types out the current phrase, pauses, deletes it, and proceeds to the next phrase in the list, wrapping back to the first after the last

### Requirement: Moon Phase on Scroll
The system SHALL shift the moon's shadow horizontally in proportion to scroll position, from the top of the page to the bottom of the scrollable area.

#### Scenario: Scrolling shifts moon shadow
- **WHEN** a user scrolls the page from top to bottom
- **THEN** the moon shadow's horizontal translation increases proportionally, reaching its maximum offset at the bottom of the page

### Requirement: Static Reward Grid

The system SHALL render the rewards grid as static cards (image, name, description, required-hours label) with no timer, slider, or unlock-state UI, matching the current live site — the timer/slider markup that exists in `script.js`/`style.css` is not present in the current `index.html` and is out of scope for this migration.

#### Scenario: Reward cards render without interactive unlock controls
- **WHEN** the rewards section renders
- **THEN** each reward card displays its image, name, description, and hours label, with no start/pause/reset timer or hours slider present

### Requirement: Mouse Spark Trail
The system SHALL spawn short-lived spark dot elements that follow the mouse cursor as it moves, fading out and being removed shortly after creation.

#### Scenario: Spark dot lifecycle
- **WHEN** the mouse moves across the page
- **THEN** spark dot elements are intermittently created at the cursor position, then fade and are removed after a short delay

### Requirement: Bat Spawner Easter Egg
The system SHALL periodically spawn a single bat animation crossing the screen at a random vertical position, random direction, and random duration, never overlapping with another in-flight bat.

#### Scenario: Periodic bat spawn
- **WHEN** the periodic spawn interval elapses and no bat is currently in flight
- **THEN** a new bat animation starts at a random height, direction, and duration, and is removed from the DOM after its animation completes

#### Scenario: No overlapping bats
- **WHEN** a bat animation is already in flight
- **THEN** the periodic spawn interval does not start a second bat until the first completes
