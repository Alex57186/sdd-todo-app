# Feature Specification: Personal TODO List

**Feature Branch**: `001-todo-app`

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description: "Personal TODO list (single user, web). The owner is the only user; they keep a simple list of things to do, reachable from any browser. US1 – Private access (P1): only the owner can see or change the list; anyone without the owner's credentials is refused. US2 – Add a TODO (P1): the owner types a short description and adds it; it appears in the list immediately as "pending". Empty/whitespace-only descriptions and descriptions longer than 200 characters are rejected. US3 – View the list (P1): the owner sees all items, newest first, each clearly showing whether it is pending or completed; an empty list shows a friendly empty-state message. US4 – Mark as completed (P2): the owner marks a pending item as completed and its status visibly changes; completion is one-way. Persistence: items survive page reloads, browser restarts, other devices, and new deployments. Out of scope: editing, deleting, un-completing, due dates, priorities, multiple users, filtering/search."

## Clarifications

### Session 2026-11-10

- Q: Should the app do anything to slow down someone who keeps guessing the owner's
  password? → A: No app-level throttling; require a strong (≥ 20-character random) owner
  password and rely on the hosting platform's standard protections.
- Q: If the list is open in two places at once, should changes made in one place appear
  in the other automatically? → A: No automatic sync; each open copy shows the latest
  data when the page is loaded or reloaded and after the owner's own add/complete actions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Private access (Priority: P1)

The owner opens the TODO application in a web browser. Before seeing anything, they are
asked for their credentials. With the correct credentials they reach their list; anyone
without them is refused and sees none of the owner's items.

**Why this priority**: The application is reachable by anyone on the internet. Without
access control, any visitor could read or alter the owner's list, so no other story is
safe to release without this one.

**Independent Test**: Can be fully tested by visiting the application with no
credentials, with wrong credentials, and with the correct credentials, and checking that
only the last case reveals the list. Delivers value on its own by guaranteeing privacy.

**Acceptance Scenarios**:

1. **Given** a visitor without credentials, **When** they open the application,
   **Then** they are asked for credentials and see no TODO items.
2. **Given** a visitor who supplies incorrect credentials, **When** they try to open
   the application, **Then** access is refused and no TODO items are revealed.
3. **Given** the owner supplies the correct credentials, **When** they open the
   application, **Then** they see their TODO list.
4. **Given** a client without valid credentials, **When** it attempts any action that
   reads or changes TODO items (view, add, complete), **Then** the action is refused
   and no data is read or changed.

---

### User Story 2 - Add a TODO (Priority: P1)

The owner types a short description of something they need to do and adds it. The new
item appears in the list straight away, marked as pending.

**Why this priority**: Capturing tasks is the core purpose of a TODO list; without it
the list is always empty.

**Independent Test**: Can be fully tested by signing in, adding an item, and confirming
it appears as pending at the top of the list; then attempting invalid inputs and
confirming they are rejected with a clear message.

**Acceptance Scenarios**:

1. **Given** the owner is signed in, **When** they enter "Buy milk" and add it,
   **Then** "Buy milk" appears at the top of the list with status "pending" without
   a manual page reload.
2. **Given** the owner is signed in, **When** they try to add an empty description or
   one containing only spaces, **Then** no item is created and they are told the
   description is required.
3. **Given** the owner is signed in, **When** they try to add a description longer
   than 200 characters, **Then** no item is created and they are told the maximum
   length is 200 characters.
4. **Given** the owner is signed in, **When** they enter "  Call Bob  " (with leading
   and trailing spaces) and add it, **Then** the item is stored and shown as
   "Call Bob".
5. **Given** the owner is signed in, **When** they add a description containing
   characters such as `<b>hi</b>`, **Then** the description is displayed exactly as
   typed (as text), not interpreted as formatting.

---

### User Story 3 - View the list (Priority: P1)

The owner sees all of their TODO items in one list, newest first. Each item clearly
shows its description and whether it is pending or completed. When there are no items,
a friendly message explains that the list is empty.

**Why this priority**: Seeing what still needs doing is the other half of the core
value; the owner must be able to review items they added earlier.

**Independent Test**: Can be fully tested by signing in with an empty list (empty-state
message shown), then with several items of mixed status (all shown, newest first, each
status distinguishable).

**Acceptance Scenarios**:

1. **Given** the owner has no TODO items, **When** they open the application,
   **Then** they see a friendly empty-state message instead of an empty list.
2. **Given** the owner added "A", then "B", then "C", **When** they open the
   application, **Then** the items are listed in the order "C", "B", "A".
3. **Given** the list contains pending and completed items, **When** the owner views
   it, **Then** each item's status is shown both by a visible label or indicator and
   by a non-colour cue (so status is distinguishable without relying on colour).
4. **Given** the owner added items earlier, **When** they reload the page, close and
   reopen the browser, or open the application on another device, **Then** they see
   the same items with the same statuses.

---

### User Story 4 - Mark as completed (Priority: P2)

The owner marks a pending item as completed once they have done it. The item's status
changes visibly in the list. Completion is final: a completed item cannot be marked as
pending again.

**Why this priority**: Tracking progress is valuable but the list is already useful
for capturing and reviewing tasks without it, so it ranks just below the P1 stories.

**Independent Test**: Can be fully tested by signing in, marking a pending item as
completed, confirming its status changes immediately and persists after reload, and
confirming completed items offer no way to revert.

**Acceptance Scenarios**:

1. **Given** a pending item "Buy milk", **When** the owner marks it as completed,
   **Then** its status changes to "completed" without a manual page reload.
2. **Given** an item was marked as completed, **When** the owner reloads the page or
   opens the application elsewhere, **Then** the item is still shown as completed.
3. **Given** a completed item, **When** the owner views it, **Then** no action is
   offered to mark it as completed again or to revert it to pending.
4. **Given** an item that is already completed (e.g. completed from another browser
   tab), **When** a request to complete it again is made, **Then** the item remains
   completed and nothing else changes.
5. **Given** an item that does not exist, **When** a request to complete it is made,
   **Then** the owner is told the item was not found and no data changes.
6. **Given** the list contains several items, **When** the owner completes one of them,
   **Then** the item keeps its position in the list (ordering stays newest first).

---

### Edge Cases

- A description of exactly 200 characters (after trimming) is accepted; 201 is rejected.
- Leading/trailing whitespace is trimmed before validation and storage; internal spaces
  are preserved.
- Descriptions containing non-Latin characters and emoji (e.g. "Купить хлеб 🍞") are
  stored and displayed correctly; length is counted in user-perceived characters.
- Descriptions containing HTML or script-like text are displayed literally and never
  executed or rendered as markup.
- The owner adds the same description twice: both items are created (duplicates are
  allowed).
- The owner submits the add form twice rapidly: each submission that reaches the system
  creates at most one item; the interface prevents an accidental double submission
  while a submission is in progress.
- A temporary failure (e.g. network loss) while adding or completing: the owner sees an
  error message, the list does not show a change that was not saved, and the owner can
  retry.
- The application is redeployed: existing items and statuses are unaffected.
- The list is open in two tabs or on two devices: a change made in one appears in the
  other after that copy is reloaded or after its next add/complete action (see FR-014a).
- Repeated failed sign-in attempts: each is refused in the same way as a single failed
  attempt; there is no lockout (see FR-003a).

## Requirements *(mandatory)*

### Functional Requirements

**Access control**

- **FR-001**: System MUST require valid owner credentials before revealing any part of
  the application or any TODO data.
- **FR-002**: System MUST refuse every read or change of TODO items from a requester
  without valid owner credentials, without revealing whether any items exist.
- **FR-003**: System MUST support exactly one user (the owner); the owner's credentials
  MUST be configurable by the operator without changing the application's code.
- **FR-003a**: The owner password MUST be a randomly generated value of at least 20
  characters. The application itself does not throttle or lock out repeated failed
  attempts; protection against password guessing relies on password strength and the
  hosting platform's standard protections.

**Adding items**

- **FR-004**: The owner MUST be able to create a TODO item by entering a text
  description.
- **FR-005**: System MUST trim leading and trailing whitespace from descriptions before
  validating and storing them.
- **FR-006**: System MUST reject descriptions that are empty after trimming, with a
  message stating that a description is required.
- **FR-007**: System MUST reject descriptions longer than 200 characters after trimming,
  with a message stating the 200-character limit.
- **FR-008**: System MUST create every new item with status "pending" and record its
  creation time.
- **FR-009**: A newly created item MUST appear in the owner's list without a manual page
  reload.

**Viewing items**

- **FR-010**: The owner MUST be able to view all of their TODO items in a single list.
- **FR-011**: System MUST order items by creation time, newest first; completing an item
  MUST NOT change its position.
- **FR-012**: System MUST show for each item its description and its status (pending or
  completed), with the status distinguishable without relying on colour alone.
- **FR-013**: System MUST show a friendly empty-state message when the owner has no items.
- **FR-014**: System MUST display descriptions as literal text, never interpreting them
  as markup or executable content.
- **FR-014a**: The list MUST show the latest stored data when the page is loaded or
  reloaded and after each of the owner's own add/complete actions. Changes made in
  another open copy of the application are NOT pushed automatically; no background
  polling or live-update connection is required.

**Completing items**

- **FR-015**: The owner MUST be able to mark a pending item as completed.
- **FR-016**: The status change MUST be visible in the list without a manual page reload.
- **FR-017**: Completion MUST be one-way: the system MUST NOT offer or perform any change
  from completed back to pending.
- **FR-018**: Requesting completion of an already completed item MUST leave it completed
  and change nothing else.
- **FR-019**: Requesting completion of a non-existent item MUST result in a "not found"
  response and no data change.

**Persistence and reliability**

- **FR-020**: System MUST store items durably so that they survive page reloads,
  browser restarts, access from other devices, and new deployments of the application.
- **FR-021**: When an add or complete operation fails, the system MUST show an error
  message and MUST NOT show the unsaved change as if it had succeeded.

**Scope boundary**

- **FR-022**: The following are explicitly out of scope and MUST NOT be implemented as
  part of this feature: editing descriptions, deleting items, reverting completed items
  to pending, due dates, priorities, multiple users or accounts, filtering, sorting
  options, and search.

### Key Entities

- **TODO Item**: A single thing the owner intends to do. Attributes: a unique
  identifier; a description (1–200 characters, trimmed); a status (pending or
  completed); the time it was created; the time it was completed (present only when
  completed).
- **Owner**: The single person allowed to use the application. Identified only by the
  credentials configured by the operator; no profile or other data is stored.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of attempts to view or change TODO items without valid credentials
  are refused, with no item data revealed.
- **SC-002**: A signed-in owner can add a new item in under 10 seconds from opening the
  application, and it is visible in the list within 1 second of submitting.
- **SC-003**: Marking an item as completed is reflected in the list within 1 second.
- **SC-004**: 100% of saved items and statuses are present and unchanged after a page
  reload, a browser restart, access from a second device, and a redeployment.
- **SC-005**: 100% of invalid descriptions (empty, whitespace-only, over 200 characters)
  are rejected with a message explaining why, and no item is created.
- **SC-006**: A first-time user can identify, without instructions, which items are
  pending and which are completed in at least 9 out of 10 attempts.
- **SC-007**: The list remains usable (loads and responds within 2 seconds) with up to
  500 items.

## Assumptions

- There is exactly one user, the owner; credentials are provided by the operator out of
  band, and there is no sign-up, password reset, or logout flow beyond what the browser
  provides natively.
- The list size is expected to stay small (hundreds of items, not thousands), so no
  paging is required; all items are shown at once.
- The application is used on modern desktop and mobile browsers; the layout must be
  usable on a phone-sized screen, but no native mobile app is provided.
- Times are recorded for ordering and history; showing timestamps in the interface is
  not required.
- Interface language is English.
- Duplicate descriptions are allowed because the owner may genuinely need to do the same
  thing twice.
- The application is accessible over HTTPS at a public address (provided by the hosting
  platform).
