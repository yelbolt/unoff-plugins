---
name: components-feedback
description: "@unoff/ui feedback and messaging components: Icon, Tooltip, Dialog, Chip, IconChip, SemanticMessage, Notification. Detail file for component-library.md — load when building modals, toasts, tooltips, or status messages."
---

# Components — Feedback & Messaging

Part of the [component-library](../component-library.md) reference. Import all from `@unoff/ui`.

### Icon

```typescript
<Icon
  type="PICTO" | "SYMBOL"
  iconName="warning" | "success" | "info" | "error" | "settings" | ...
  error={false}
  customColor="#FF0000"
/>
```

**Icon Types**:
- `PICTO`: Pictogram style icons
- `SYMBOL`: Symbol/glyph icons


### Tooltip

```typescript
<div
  style={{ position: 'relative' }}
  onMouseEnter={() => this.setState({ showTooltip: true })}
  onMouseLeave={() => this.setState({ showTooltip: false })}
>
  <Icon type="PICTO" iconName="info" />
  {this.state.showTooltip && (
    <Tooltip 
      pin="TOP" | "BOTTOM" | "LEFT" | "RIGHT"
      type="SINGLE_LINE" | "MULTI_LINE"
    >
      This is helpful information
    </Tooltip>
  )}
</div>
```


### Dialog (Modal)

```typescript
<Dialog
  title="My Dialog Title"
  pin="RIGHT"
  isLoading={false}
  isMessage={false}
  tag="Feature"
  indicator="1 of 3"
  actions={{
    primary: {
      label: "Confirm",
      state: "DEFAULT" | "LOADING" | "DISABLED",
      isAutofocus: true,
      action: (e: MouseEvent) => { /* handle confirm */ },
    },
    secondary: {
      label: "Learn More",
      action: () => { /* handle secondary action */ },
    },
  }}
  onClose={(e: MouseEvent) => { /* handle close */ }}
>
  {/* Children content */}
  <p>Dialog body content</p>
</Dialog>
```

**Props**:
- `title`: Dialog header text
- `pin`: Position — `"RIGHT"` slides from right
- `isLoading`: Show loading spinner instead of content
- `isMessage`: Display as a centered message dialog
- `tag`: Optional tag badge next to title
- `indicator`: Pagination indicator (e.g., `"1 of 3"`)
- `actions`: Primary and optional secondary action buttons
  - `primary.state`: `"DEFAULT"` | `"LOADING"` | `"DISABLED"`
  - `primary.isAutofocus`: Auto-focus the button
- `onClose`: Close handler
- `children`: Body content (JSX)

**Use Cases**: Modals, side panels, announcements, forms, confirmations.


### Chip

```typescript
<Chip>Label text</Chip>
```

**Props**:
- `children`: Chip text content


### IconChip

```typescript
<IconChip
  iconType="PICTO"
  iconName="info" | "warning"
  text="Tooltip text or JSX"
  pin="TOP" | "BOTTOM"
  type="MULTI_LINE" | "SINGLE_LINE"
/>
```

**Props**:
- `iconType`: `"PICTO"` | `"SYMBOL"`
- `iconName`: Icon identifier
- `text`: Tooltip content (string or JSX)
- `pin`: Tooltip position
- `type`: Single or multi-line tooltip


### SemanticMessage

```typescript
<SemanticMessage
  type="INFO" | "WARNING" | "SUCCESS" | "ERROR"
  message="Message text"
  actionsSlot={
    <>
      <Button type="secondary" label="Accept" action={handleAccept} />
      <Button type="icon" icon="close" action={handleDismiss} />
    </>
  }
  isAnchored={true}
/>
```

**Props**:
- `type`: Message severity — `"INFO"` | `"WARNING"` | `"SUCCESS"` | `"ERROR"`
- `message`: Message text
- `actionsSlot`: Optional React node for action buttons
- `isAnchored`: Pin message to bottom of the view

**Use Cases**: Inline warnings, info banners, language suggestions.


### Notification

```typescript
<Notification
  type="INFO" | "SUCCESS" | "WARNING" | "ERROR"
  message="Notification text"
  timer={3000}
  onClose={handleClose}
/>
```

**Props**:
- `type`: Notification severity
- `message`: Notification text
- `timer`: Auto-dismiss delay in milliseconds
- `onClose`: Close handler

**Use Cases**: Toast notifications for Canvas → UI feedback (success, error messages).

