---
name: components-forms
description: "@unoff/ui form components: Input, Dropdown, FormItem, Consent, plus a complete composed example. Detail file for component-library.md — load when building forms, inputs, dropdowns, or consent dialogs."
---

# Components — Forms & Inputs

Part of the [component-library](../component-library.md) reference. Import all from `@unoff/ui`.

### Input

```typescript
<Input
  id="unique-input-id"
  type="TEXT" | "NUMBER" | "PASSWORD"
  placeholder="Enter value..."
  value={this.state.value}
  charactersLimit={64}
  min={0}
  max={100}
  step={1}
  helper={{
    label: "Helper text explaining the input",
    pin: "TOP" | "BOTTOM"
  }}
  isBlocked={this.features.FEATURE.isBlocked()}
  isNew={this.features.FEATURE.isNew()}
  feature="FEATURE_NAME"
  onBlur={(e) => {
    // Handle blur
  }}
  onChange={(e) => {
    // Handle change
  }}
  onValid={(e) => {
    // Handle valid input submission
  }}
/>
```

**Props**:
- `id`: Unique identifier
- `type`: Input type
- `placeholder`: Placeholder text
- `value`: Controlled value
- `charactersLimit`: Max character count
- `min/max/step`: For number inputs
- `helper`: Tooltip help text
- `isBlocked/isNew/feature`: Feature control
- `onBlur/onChange/onValid`: Event handlers


### Dropdown

```typescript
<Dropdown
  id="my-dropdown"
  options={[
    {
      label: "Option 1",
      value: "option1",
      type: "OPTION",
      isActive: this.state.selected === "option1",
      isBlocked: this.features.OPTION1.isReached(count),
      isNew: this.features.OPTION1.isNew(),
      action: (e) => this.handleSelect("option1")
    },
    {
      type: "SEPARATOR"
    },
    {
      label: "Option 2",
      value: "option2",
      type: "OPTION",
      isActive: this.state.selected === "option2",
      action: (e) => this.handleSelect("option2")
    }
  ]}
  selected={this.state.selected}
  alignment="LEFT" | "RIGHT" | "FILL"
  pin="NONE" | "TOP" | "BOTTOM"
  helper={{
    label: "Choose an option",
    pin: "TOP",
    type: "SINGLE_LINE" | "MULTI_LINE"
  }}
  preview={{
    image: imageUrl,
    text: "Preview description",
    pin: "TOP" | "BOTTOM"
  }}
  warning={{
    label: "Warning message",
    pin: "TOP" | "BOTTOM",
    type: "SINGLE_LINE" | "MULTI_LINE"
  }}
  shouldReflow={{
    isEnabled: true,
    icon: "adjust"
  }}
  isDisabled={false}
  isBlocked={this.features.FEATURE.isBlocked()}
  isNew={this.features.FEATURE.isNew()}
  canBeSearched={true}
  searchLabel="Search…"
  noResultsLabel="No results"
  onUnblock={() => {
    sendPluginMessage({ pluginMessage: { type: 'GET_PRO' } }, '*')
  }}
/>
```

**Option Types**:
- `OPTION`: Selectable item
- `SEPARATOR`: Visual divider
- `TITLE`: Section header

**Search props** (new):
- `canBeSearched`: Enable a search input above the list
- `searchLabel`: Placeholder text for the search input
- `noResultsLabel`: Message shown when no option matches


### FormItem

```typescript
<FormItem
  label="Field Label"
  id="field-id"
  shouldFill
  isMultiLine={false}
>
  <Input type="TEXT" id="field-id" value="" />
</FormItem>
```

**Props**:
- `label`: Form field label
- `id`: Matching ID for the inner input
- `shouldFill`: Expand to fill available width
- `isMultiLine`: Set true for textarea-style fields
- `children`: Input or other form control


### Consent

```typescript
<Consent
  welcomeMessage="We use cookies for analytics..."
  vendorsMessage="Manage your preferences"
  privacyPolicy={{
    label: "Privacy Policy",
    action: () => { /* open privacy policy */ },
  }}
  moreDetailsLabel="Customize"
  lessDetailsLabel="Back"
  consentActions={{
    consent: {
      label: "Accept All",
      action: (vendors: Array<ConsentConfiguration>) => { /* handle */ },
    },
    deny: {
      label: "Deny All",
      action: (vendors: Array<ConsentConfiguration>) => { /* handle */ },
    },
    save: {
      label: "Save Preferences",
      action: (vendors: Array<ConsentConfiguration>) => { /* handle */ },
    },
  }}
  validVendor={{
    name: "Functional",
    id: "functional",
    icon: "",
    description: "Required for basic functionality",
    isConsented: true,
  }}
  vendorsList={userConsentArray}
  canBeClosed
  closeLabel="Close"
  onClose={() => { /* handle close */ }}
/>
```

**Props**:
- `welcomeMessage`: Welcome/intro text
- `vendorsMessage`: Vendor section header
- `privacyPolicy`: Link with `label` and `action`
- `moreDetailsLabel` / `lessDetailsLabel`: Toggle labels
- `consentActions`: Consent/deny/save buttons — each `action` receives `Array<ConsentConfiguration>`
- `validVendor`: Always-on functional vendor
- `vendorsList`: Array of `ConsentConfiguration` items (from stores)
- `canBeClosed` / `closeLabel` / `onClose`: Close behavior

**Type**: `ConsentConfiguration` is also exported as a TypeScript type for typing consent handler signatures.


## Full Example — Composing Bar, Input, Dropdown, Button

```typescript
import React from 'react'
import { doClassnames, FeatureStatus } from '@unoff/utils'
import { Button, Input, Dropdown, Bar, layouts, texts } from '@unoff/ui'
import { sendPluginMessage } from '../utils/pluginMessage'

interface Props {
  planStatus: PlanStatus
  config: ConfigContextType
  service: Service
  editor: Editor
  t: (key: string) => string
}

interface State {
  name: string
  exportFormat: string
  isLoading: boolean
}

export default class ExportPanel extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      name: '',
      exportFormat: 'PNG',
      isLoading: false
    }
  }
  
  // Define features
  static features = (
    planStatus: PlanStatus,
    config: ConfigContextType,
    service: Service,
    editor: Editor
  ) => ({
    EXPORT_PNG: new FeatureStatus({
      features: config.features,
      featureName: 'EXPORT_PNG',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    EXPORT_SVG: new FeatureStatus({
      features: config.features,
      featureName: 'EXPORT_SVG',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    BATCH_EXPORT: new FeatureStatus({
      features: config.features,
      featureName: 'BATCH_EXPORT',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
  })

  // Declared right after `static features`, right before `constructor`.
  private get features() {
    return ExportPanel.features(
      this.props.planStatus,
      this.props.config,
      this.props.service,
      this.props.editor
    )
  }
  
  handleExport = () => {
    this.setState({ isLoading: true })
    
    sendPluginMessage({
      pluginMessage: {
        type: 'EXPORT_NODES',
        data: {
          format: this.state.exportFormat,
          name: this.state.name
        }
      }
    })
  }
  
  render() {
    return (
      <div>
        <Bar
          leftPartSlot={
            <div className={layouts['snackbar--medium']}>
              <span className={texts['type']}>
                {this.props.t('export.title')}
              </span>
            </div>
          }
          border={['BOTTOM']}
        />
        
        <div style={{ padding: '16px' }}>
          <Input
            id="export-name"
            type="TEXT"
            placeholder={this.props.t('export.namePlaceholder')}
            value={this.state.name}
            charactersLimit={64}
            helper={{
              label: this.props.t('export.nameHelper'),
              pin: 'TOP'
            }}
            onChange={(e) => this.setState({ name: e.currentTarget.value })}
            onValid={(e) => this.handleExport()}
          />
          
          <Dropdown
            id="export-format"
            options={[
              {
                label: 'PNG',
                value: 'PNG',
                type: 'OPTION',
                isActive: this.state.exportFormat === 'PNG',
                isBlocked: this.features.EXPORT_PNG.isBlocked(),
                action: () => this.setState({ exportFormat: 'PNG' })
              },
              {
                label: 'SVG',
                value: 'SVG',
                type: 'OPTION',
                isActive: this.state.exportFormat === 'SVG',
                isBlocked: this.features.EXPORT_SVG.isBlocked(),
                isNew: this.features.EXPORT_SVG.isNew(),
                action: () => this.setState({ exportFormat: 'SVG' })
              }
            ]}
            selected={this.state.exportFormat}
            pin="BOTTOM"
          />
          
          <Button
            type="primary"
            label={this.props.t('export.button')}
            feature="EXPORT"
            isBlocked={this.features.BATCH_EXPORT.isBlocked()}
            isLoading={this.state.isLoading}
            isDisabled={!this.state.name}
            action={this.handleExport}
            onUnblock={() => {
              sendPluginMessage({
                pluginMessage: { type: 'GET_PRO' }
              }, '*')
            }}
          />
        </div>
      </div>
    )
  }
}
```

