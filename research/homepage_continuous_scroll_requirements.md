# Styling
Feature full screen images (image format will be decided by you based on web standards) as the background, covering the entirety of the screen. For development, use distinct colors as background placeholders.

Content must be centered, and text block width (automatic text wrap around to new line) will be based on resolution.

Images and content must be able to be displayed side by side (left to right), as well as up to down. Flexboxes and directions will be used for this and will be different for each section. For development, it is okay to choose a random orientation for each section.

Content orientation may differ between resolutions, if a screen (e.g. phone) is too small to display it from a left to right orientation.

A home page navigation menu ( a kin to a floating taskbar ) will be displayed at the bottom. This can be clickable to navigate to the next section, but will also highlight the next section if the user scrolls down. The current section is always highlighted

Text will be displayed directly on top of the background, no intermediate layers.

Color scheme will follow pre-established adwaita design language specified in the curent CSS.
shadCN components will be used if possible, only use custom components if functionality is missing within shadCN or shadCN component styling interferes with the requirements listed above.

# Development
Follow AGENTS.md always.
Split up beads tasks where necessary (adhere to single responsiblity per task principle). 