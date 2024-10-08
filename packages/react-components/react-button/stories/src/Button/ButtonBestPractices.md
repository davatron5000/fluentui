## Best practices

### Layout

- For dialog boxes and panels, where people are moving through a sequence of screens, right-align buttons with the
  container.
- For single-page forms and focused tasks, left-align buttons with the container.
- Always place the primary button on the left, the secondary button just to the right of it.
- Show only one primary button that inherits theme color at rest state. If there are more than two buttons with
  equal priority, all buttons should have neutral backgrounds.
- Don't use a button to navigate to another place; use a link instead. The exception is in a wizard where "Back" and
  "Next" buttons may be used.
- Don't place the default focus on a button that destroys data. Instead, place the default focus on the button that
  performs the "safe act" and retains the content (such as "Save") or cancels the action (such as "Cancel").
- When overriding layout styles, ensure buttons are always at least 24px by 24px to meet [WCAG target size requirements](https://w3c.github.io/wcag/understanding/target-size-minimum.html). This is already covered by our default styles for all buttons but SplitButton for all size variants if no style customizations are used.
- Only use a small SplitButton if the user has specifically chosen a compact layout, or if there is an equally efficient alternative method to perform the same action.

### Content

- Use sentence-style capitalization—only capitalize the first word. For more info, see
  [Capitalization](https://docs.microsoft.com/en-us/style-guide/capitalization) in the Microsoft Writing Style Guide.
- Make sure it's clear what will happen when people interact with the button. Be concise; usually a single verb
  is best. Include a noun if there is any room for interpretation about what the verb means.
  For example, "Delete folder" or "Create account".
