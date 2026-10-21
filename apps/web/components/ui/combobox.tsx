'use client';

/**
 * Combobox primitives. Same exports and composition as the shadcn/ui "base" Combobox
 * (https://ui.shadcn.com/docs/components/base/combobox), built on Base UI. This project has no
 * Tailwind, so the shadcn utility classes are replaced by the `combobox-*` rules in
 * app/styles/components.css, which use the app's design tokens.
 */
import { Combobox as ComboboxPrimitive } from '@base-ui/react';
import { Check, ChevronDown, X } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/cn';

const Combobox = ComboboxPrimitive.Root;

function ComboboxValue(props: ComboboxPrimitive.Value.Props) {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />;
}

function ComboboxTrigger({ className, children, ...props }: ComboboxPrimitive.Trigger.Props) {
  return (
    <ComboboxPrimitive.Trigger data-slot="combobox-trigger" className={cn('combobox-trigger', className)} {...props}>
      {children}
      <ChevronDown size={16} aria-hidden />
    </ComboboxPrimitive.Trigger>
  );
}

function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
  return (
    <ComboboxPrimitive.Clear data-slot="combobox-clear" className={cn('combobox-clear', className)} {...props}>
      <X size={14} aria-hidden />
    </ComboboxPrimitive.Clear>
  );
}

function ComboboxInput({
  className,
  children,
  disabled = false,
  showTrigger = true,
  showClear = false,
  ...props
}: ComboboxPrimitive.Input.Props & { showTrigger?: boolean; showClear?: boolean }) {
  return (
    <div className={cn('combobox-input', className)} data-slot="combobox-input-group">
      <ComboboxPrimitive.Input disabled={disabled} {...props} />
      <div className="combobox-addons">
        {showClear && <ComboboxClear disabled={disabled} />}
        {showTrigger && <ComboboxTrigger disabled={disabled} aria-label="Toggle options" />}
      </div>
      {children}
    </div>
  );
}

function ComboboxContent({
  className,
  side = 'bottom',
  sideOffset = 6,
  align = 'start',
  alignOffset = 0,
  anchor,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<ComboboxPrimitive.Positioner.Props, 'side' | 'align' | 'sideOffset' | 'alignOffset' | 'anchor'>) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner side={side} sideOffset={sideOffset} align={align} alignOffset={alignOffset} anchor={anchor} className="combobox-positioner">
        <ComboboxPrimitive.Popup data-slot="combobox-content" className={cn('combobox-content', className)} {...props} />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return <ComboboxPrimitive.List data-slot="combobox-list" className={cn('combobox-list', className)} {...props} />;
}

function ComboboxItem({ className, children, ...props }: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item data-slot="combobox-item" className={cn('combobox-item', className)} {...props}>
      {children}
      <ComboboxPrimitive.ItemIndicator render={<span className="combobox-item-indicator" />}>
        <Check size={15} aria-hidden />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

function ComboboxGroup({ className, ...props }: ComboboxPrimitive.Group.Props) {
  return <ComboboxPrimitive.Group data-slot="combobox-group" className={cn('combobox-group', className)} {...props} />;
}

function ComboboxLabel({ className, ...props }: ComboboxPrimitive.GroupLabel.Props) {
  return <ComboboxPrimitive.GroupLabel data-slot="combobox-label" className={cn('combobox-label', className)} {...props} />;
}

function ComboboxCollection(props: ComboboxPrimitive.Collection.Props) {
  return <ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />;
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return <ComboboxPrimitive.Empty data-slot="combobox-empty" className={cn('combobox-empty', className)} {...props} />;
}

function ComboboxSeparator({ className, ...props }: ComboboxPrimitive.Separator.Props) {
  return <ComboboxPrimitive.Separator data-slot="combobox-separator" className={cn('combobox-separator', className)} {...props} />;
}

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
};
