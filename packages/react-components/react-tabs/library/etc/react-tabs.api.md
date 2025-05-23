## API Report File for "@fluentui/react-tabs"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts

import type { ComponentProps } from '@fluentui/react-utilities';
import type { ComponentState } from '@fluentui/react-utilities';
import type { ContextSelector } from '@fluentui/react-context-selector';
import { FC } from 'react';
import type { ForwardRefComponent } from '@fluentui/react-utilities';
import { Provider } from 'react';
import { ProviderProps } from 'react';
import * as React_2 from 'react';
import type { Slot } from '@fluentui/react-utilities';
import { SlotClassNames } from '@fluentui/react-utilities';

// @public (undocumented)
export type RegisterTabEventHandler = (data: TabRegisterData) => void;

// @public
export const renderTab_unstable: (state: TabState) => JSX.Element;

// @public
export const renderTabList_unstable: (state: TabListState, contextValues: TabListContextValues) => JSX.Element;

// @public (undocumented)
export type SelectTabData = {
    value: TabValue;
};

// @public (undocumented)
export type SelectTabEvent<E = HTMLElement> = React_2.MouseEvent<E> | React_2.KeyboardEvent<E> | React_2.FocusEvent<E>;

// @public (undocumented)
export type SelectTabEventHandler = (event: SelectTabEvent, data: SelectTabData) => void;

// @public
export const Tab: ForwardRefComponent<TabProps>;

// @public (undocumented)
export const tabClassNames: SlotClassNames<TabSlots>;

// @public
export const TabList: ForwardRefComponent<TabListProps>;

// @public (undocumented)
export const tabListClassNames: SlotClassNames<TabListSlots>;

// @public (undocumented)
export type TabListContextValue = Pick<TabListProps, 'onTabSelect' | 'selectTabOnFocus' | 'selectedValue' | 'reserveSelectedTabSpace'> & Required<Pick<TabListProps, 'appearance' | 'disabled' | 'size' | 'vertical'>> & {
    onRegister: RegisterTabEventHandler;
    onUnregister: RegisterTabEventHandler;
    onSelect: SelectTabEventHandler;
    getRegisteredTabs: () => {
        selectedValue?: TabValue;
        previousSelectedValue?: TabValue;
        registeredTabs: Record<string, TabRegisterData>;
    };
};

// @public
export type TabListContextValues = {
    tabList: TabListContextValue;
};

// @public
export type TabListProps = ComponentProps<TabListSlots> & {
    appearance?: 'transparent' | 'subtle' | 'subtle-circular' | 'filled-circular';
    reserveSelectedTabSpace?: boolean;
    defaultSelectedValue?: TabValue;
    disabled?: boolean;
    onTabSelect?: SelectTabEventHandler;
    selectTabOnFocus?: boolean;
    selectedValue?: TabValue;
    size?: 'small' | 'medium' | 'large';
    vertical?: boolean;
};

// @public (undocumented)
export const TabListProvider: Provider<TabListContextValue> & FC<ProviderProps<TabListContextValue>>;

// @public (undocumented)
export type TabListSlots = {
    root: Slot<'div'>;
};

// @public
export type TabListState = ComponentState<Required<TabListSlots>> & TabListContextValue;

// @public
export type TabProps = Omit<ComponentProps<Partial<TabSlots>>, 'content' | 'value'> & Pick<Partial<TabSlots>, 'content'> & {
    disabled?: boolean;
    value: TabValue;
};

// @public (undocumented)
export type TabRegisterData = {
    value: TabValue;
    ref: React_2.RefObject<HTMLElement>;
};

// @public (undocumented)
export type TabSlots = {
    root: Slot<'button'>;
    icon?: Slot<'span'>;
    content: NonNullable<Slot<'span'>>;
};

// @public
export type TabState = ComponentState<TabInternalSlots> & Pick<TabProps, 'value'> & Required<Pick<TabProps, 'disabled'>> & {
    appearance?: 'transparent' | 'subtle' | 'subtle-circular' | 'filled-circular';
    iconOnly: boolean;
    selected: boolean;
    contentReservedSpaceClassName?: string;
    size: 'small' | 'medium' | 'large';
    vertical: boolean;
};

// @public
export type TabValue = unknown;

// @public
export const useTab_unstable: (props: TabProps, ref: React_2.Ref<HTMLElement>) => TabState;

// @public
export const useTabButtonStyles_unstable: (state: TabState, slot: TabState['root']) => TabState;

// @public
export const useTabContentStyles_unstable: (state: TabState) => TabState;

// @public
export const useTabIndicatorStyles_unstable: (state: TabState) => TabState;

// @public
export const useTabList_unstable: (props: TabListProps, ref: React_2.Ref<HTMLElement>) => TabListState;

// @public (undocumented)
export const useTabListContext_unstable: <T>(selector: ContextSelector<TabListContextValue, T>) => T;

// @public (undocumented)
export function useTabListContextValues_unstable(state: TabListState): TabListContextValues;

// @public
export const useTabListStyles_unstable: (state: TabListState) => TabListState;

// @public
export const useTabStyles_unstable: (state: TabState) => TabState;

// (No @packageDocumentation comment for this package)

```
