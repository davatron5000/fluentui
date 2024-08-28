import { attr, FASTElement, nullableNumberConverter, volatile } from '@microsoft/fast-element';
import { toggleAttrState, toggleState } from '../utils/element-internals.js';
import { ProgressBarShape, ProgressBarThickness, ProgressBarValidationState } from './progress-bar.options.js';

/**
 * A Progress HTML Element.
 * Implements the {@link https://www.w3.org/TR/wai-aria-1.1/#progressbar | ARIA progressbar }.
 *
 * @public
 */
export class BaseProgressBar extends FASTElement {
  /**
   * The internal {@link https://developer.mozilla.org/docs/Web/API/ElementInternals | `ElementInternals`} instance for the component.
   *
   * @internal
   */
  public elementInternals: ElementInternals = this.attachInternals();

  /**
   * The validation state of the progress bar
   * @public
   * HTML Attribute: `validation-state`
   */
  @toggleAttrState
  @attr({ attribute: 'validation-state' })
  public validationState: ProgressBarValidationState | null = null;

  /**
   * The value of the progress
   * @internal
   * HTML Attribute: `value`
   */
  @attr({ converter: nullableNumberConverter })
  public value?: number;

  /**
   * Updates the percent complete when the `value` property changes.
   *
   * @internal
   */
  protected valueChanged(prev: number | undefined, next: number | undefined): void {
    this.elementInternals.ariaValueNow = typeof next === 'number' ? `${next}` : null;
  }

  /**
   * The minimum value
   * @internal
   * HTML Attribute: `min`
   */
  @attr({ converter: nullableNumberConverter })
  public min?: number;

  /**
   * Updates the percent complete when the `min` property changes.
   *
   * @param prev - The previous min value
   * @param next - The current min value
   */
  protected minChanged(prev: number | undefined, next: number | undefined): void {
    this.elementInternals.ariaValueMin = typeof next === 'number' ? `${next}` : null;
  }

  /**
   * The maximum value
   * @internal
   * HTML Attribute: `max`
   */
  @attr({ converter: nullableNumberConverter })
  public max?: number;

  /**
   * Updates the percent complete when the `max` property changes.
   *
   * @param prev - The previous max value
   * @param next - The current max value
   * @internal
   */
  protected maxChanged(prev: number | undefined, next: number | undefined): void {
    this.elementInternals.ariaValueMax = typeof next === 'number' ? `${next}` : null;
  }

  /**
   * Indicates progress in %
   * @internal
   */
  @volatile
  public get percentComplete(): number {
    const min = this.min ?? 0;
    const max = this.max ?? 100;
    const value = this.value ?? 0;
    const range = max - min;

    return range === 0 ? 0 : Math.fround(((value - min) / range) * 100);
  }

  public constructor() {
    super();

    this.elementInternals.role = 'progressbar';
  }
}

/**
 * A Progress HTML Element.
 * Based on BaseProgressBar and includes style and layout specific attributes
 *
 * @public
 */
export class ProgressBar extends BaseProgressBar {
  /**
   * The thickness of the progress bar
   *
   * @public
   * HTML Attribute: `thickness`
   */
  @toggleAttrState
  @attr
  public thickness?: ProgressBarThickness;

  /**
   * The shape of the progress bar
   * @public
   * HTML Attribute: `shape`
   */
  @toggleAttrState
  @attr
  public shape?: ProgressBarShape;
}
