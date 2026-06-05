---
name: MintPet Care System
colors:
  surface: '#e9fdff'
  surface-dim: '#c8dee0'
  surface-bright: '#e9fdff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#e1f8fa'
  surface-container: '#dcf2f4'
  surface-container-high: '#d6ecef'
  surface-container-highest: '#d0e7e9'
  on-surface: '#0a1f21'
  on-surface-variant: '#3c4a42'
  inverse-surface: '#203436'
  inverse-on-surface: '#dff5f7'
  outline: '#6c7a71'
  outline-variant: '#bbcabf'
  surface-tint: '#006c49'
  primary: '#006c49'
  on-primary: '#ffffff'
  primary-container: '#18b981'
  on-primary-container: '#00422b'
  inverse-primary: '#51dea3'
  secondary: '#005cba'
  on-secondary: '#ffffff'
  secondary-container: '#448ffd'
  on-secondary-container: '#002959'
  tertiary: '#ae3115'
  on-tertiary: '#ffffff'
  tertiary-container: '#ff7c5e'
  on-tertiary-container: '#731300'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#71fbbd'
  primary-fixed-dim: '#51dea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#d7e3ff'
  secondary-fixed-dim: '#abc7ff'
  on-secondary-fixed: '#001b3f'
  on-secondary-fixed-variant: '#00458e'
  tertiary-fixed: '#ffdad2'
  tertiary-fixed-dim: '#ffb4a3'
  on-tertiary-fixed: '#3d0600'
  on-tertiary-fixed-variant: '#8c1900'
  background: '#e9fdff'
  on-background: '#0a1f21'
  surface-variant: '#d0e7e9'
  accent-yellow: '#FFE066'
  bg-cloud: '#F8FBFA'
  bg-mint: '#E8F8F2'
  bg-lake: '#EAF3FF'
  surface-white: '#FFFFFF'
  text-secondary: '#6B7280'
  border-light: '#E5E7EB'
  status-success: '#16A34A'
  status-warning: '#D97706'
  status-error: '#DC2626'
typography:
  page-title:
    fontFamily: beVietnamPro
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  section-title:
    fontFamily: beVietnamPro
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-main:
    fontFamily: beVietnamPro
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: beVietnamPro
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-bold:
    fontFamily: beVietnamPro
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  numeric-display:
    fontFamily: beVietnamPro
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  edge-margin: 16px
  stack-gap: 20px
  item-gap: 12px
  card-padding: 16px
  button-height: 48px
  list-item-min-height: 56px
---

## Brand & Style

The design system embodies a youthful, refreshing, and professional persona tailored for a high-quality pet care service. It avoids the heaviness of traditional corporate tools, opting instead for a "Light Tech" aesthetic that feels approachable yet reliable. The emotional goal is to evoke a sense of cleanliness, vitality, and trust.

The visual style is **Corporate / Modern** with a lean towards **Minimalism**. It prioritizes content clarity and stable hierarchies over decorative elements. The interface uses generous whitespace, subtle background tints, and a structured grid to create a low-noise environment where professional utility meets a bright, modern lifestyle feel.

## Colors

The palette is anchored by **Vibrant Mint Green** as the primary brand driver, symbolizing health and vitality. **Clear Lake Blue** serves as the secondary color for professional trust and navigational contrast. 

**Color Application Rules:**
- **Backgrounds:** Primarily use `bg-cloud` (#F8FBFA). Use `bg-mint` or `bg-lake` for subtle section differentiation.
- **Accents:** `tertiary_color_hex` (Coral Orange) and `accent-yellow` are reserved strictly for small highlights, badges, or notification dots to maintain a professional "low-noise" interface.
- **Typography:** Use `neutral_color_hex` (Deep Cyan Gray) for primary text to avoid the harshness of pure black, and `text-secondary` for metadata and descriptions.

## Typography

The system utilizes **Be Vietnam Pro** for its friendly yet contemporary feel, which aligns with the "young and professional" brand personality. 

**Hierarchy & Scale:**
- **Page Titles:** Reserved for top-level navigation headers.
- **Section Titles:** Used for card headers and major content groupings.
- **Body Text:** Optimized for readability on mobile screens (375px width).
- **Labels:** Used for tags and status indicators, often paired with a light background fill.
- **Numbers:** Key metrics (e.g., prices, points, counts) are emphasized with a heavier weight and larger scale to ensure they are scannable.

## Layout & Spacing

This design system follows a **Fixed Grid** model optimized for WeChat Mini Programs (375px viewport). 

**Key Principles:**
- **Safe Zones:** A 16px lateral margin is strictly enforced for all content to prevent visual crowding.
- **Vertical Rhythm:** Modules are separated by 20px, while items within a module (like list entries) use 12px spacing.
- **Mobile First:** All interactive elements maintain a minimum hit target area of 44px-48px. 
- **Bottom Actions:** Floating or fixed action buttons must include a safe area at the bottom of the screen (34px on iPhone X+ models).

## Elevation & Depth

Visual hierarchy is primarily established through **Tonal Layers** rather than heavy shadows. 

- **Primary Layer:** The cloud-white background (`#F8FBFA`) acts as the canvas.
- **Surface Layer:** White cards (`#FFFFFF`) sit on top of the canvas to group information.
- **Interaction Layer:** Very light ambient shadows are used sparingly to suggest lift on floating buttons or primary action cards. Shadow Spec: `0 4px 16px rgba(21, 61, 53, 0.06)`.
- **Alternative Tiering:** Use light-colored background blocks (`bg-mint` or `bg-lake`) instead of borders to define secondary functional areas.

## Shapes

The shape language is consistently **Rounded**, providing a soft and friendly aesthetic without becoming "toy-like."

- **Containers & Cards:** 8px radius (`rounded-lg` equivalent) is the standard for all content surfaces.
- **Interactions:** Buttons, input fields, and tags use a slightly tighter 6px radius to maintain a crisp, professional look.
- **Visual Elements:** Avatars and category icons may use circular containers (50% radius) to break the rectangular grid and add visual interest.

## Components

**Buttons**
- **Primary:** Solid `#18B981` background with white text. Reserved for the "Final Action" on a page.
- **Secondary:** `#E8F8F2` (Light Mint) background with `#172B2D` text. Used for supporting actions.
- **Tertiary/Ghost:** Transparent background with `#18B981` or `#2F80ED` text for low-priority links.

**Cards**
- White background, 8px rounded corners, and no more than 3 levels of information hierarchy. Never nest cards within cards.

**Inputs & Forms**
- Inputs utilize a 6px radius, a white background, and a 1px border of `#E5E7EB`. Focus states should highlight the border in the Primary Mint color.

**List Items**
- Heights range between 56px and 72px. Use subtle `#E5E7EB` dividers or 12px vertical gaps. The right side of the list item is reserved for status labels or navigational arrows.

**Status Tags**
- Small (12px text) with a 6px radius. Always use a light background version of the status color (e.g., light red for Error, light orange for Pending) with dark text to ensure readability and a "soft" appearance.

**Bottom Tab Bar**
- Clean, linear icons. Active state uses `#18B981`. Inactive state uses `#6B7280`. A 1px top border of `#E5E7EB` separates the bar from the content.