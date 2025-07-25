import * as React from 'react';
import { max as d3Max, min as d3Min } from 'd3-array';
import { select as d3Select } from 'd3-selection';
import { Axis as D3Axis } from 'd3-axis';
import { scaleLinear as d3ScaleLinear, ScaleLinear, scaleBand as d3ScaleBand } from 'd3-scale';
import {
  classNamesFunction,
  getId,
  getRTL,
  initializeComponentRef,
  memoizeFunction,
  warnDeprecations,
} from '@fluentui/react/lib/Utilities';
import { IProcessedStyleSet } from '@fluentui/react/lib/Styling';
import { DirectionalHint } from '@fluentui/react/lib/Callout';
import { FocusZoneDirection } from '@fluentui/react-focus';
import {
  ChartTypes,
  IAxisData,
  getAccessibleDataObject,
  tooltipOfAxislabels,
  XAxisTypes,
  getTypeOfAxis,
  formatScientificLimitWidth,
  getScalePadding,
  getBarWidth,
  isScalePaddingDefined,
  createNumericYAxis,
  IDomainNRange,
  domainRangeOfXStringAxis,
  createStringYAxis,
  getNextGradient,
  getNextColor,
  areArraysEqual,
  calculateLongestLabelWidth,
  YAxisType,
  sortAxisCategories,
  calcTotalWidth,
  calcBandwidth,
  calcTotalBandUnits,
  calcRequiredWidth,
} from '../../utilities/index';
import {
  IAccessibilityProps,
  CartesianChart,
  ILegend,
  IGroupedVerticalBarChartData,
  IGroupedVerticalBarChartProps,
  IGroupedVerticalBarChartStyleProps,
  IGroupedVerticalBarChartStyles,
  IGVBarChartSeriesPoint,
  IMargins,
  IBasestate,
  Legends,
} from '../../index';
import { IChart, IImageExportOptions } from '../../types/index';
import { toImage } from '../../utilities/image-export-utils';
import { ILegendContainer } from '../Legends/index';
import { rgb } from 'd3-color';

const COMPONENT_NAME = 'GROUPED VERTICAL BAR CHART';
const getClassNames = classNamesFunction<IGroupedVerticalBarChartStyleProps, IGroupedVerticalBarChartStyles>();
type StringAxis = D3Axis<string>;
type NumericAxis = D3Axis<number | { valueOf(): number }>;

const MIN_DOMAIN_MARGIN = 8;
const X1_INNER_PADDING = 0.1;
const VERTICAL_BAR_GAP = 1;
const MIN_BAR_HEIGHT = 1;

// This interface used for - While forming datapoints from given prop "data" in code
interface IGVDataPoint {
  [key: string]: number | string;
}

// While forming datapoints from given prop "data" in code. These datapoints are used for to draw graph easily.
interface IGVSingleDataPoint {
  [key: string]: IGVDataPoint;
}
export interface IGroupedVerticalBarChartState extends IBasestate {
  dataPointCalloutProps?: IGVBarChartSeriesPoint;
  callOutAccessibilityData?: IAccessibilityProps;
  calloutLegend: string;
  selectedLegends: string[];
}

export class GroupedVerticalBarChartBase
  extends React.Component<IGroupedVerticalBarChartProps, IGroupedVerticalBarChartState>
  implements IChart
{
  public static defaultProps: Partial<IGroupedVerticalBarChartProps> = {
    maxBarWidth: 24,
    xAxisCategoryOrder: 'default',
  };

  private _createSet: (
    data: IGroupedVerticalBarChartData[],
  ) => // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { legends: string[]; xAxisLabels: string[]; datasetForBars: any };
  private _legends: string[];
  private _xAxisLabels: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _datasetForBars: any;
  private margins: IMargins;
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  private _groupedVerticalBarGraph: JSX.Element[];
  private _classNames: IProcessedStyleSet<IGroupedVerticalBarChartStyles>;
  private _yMax: number;
  private _calloutId: string;
  private _tooltipId: string;
  private _xAxisType: XAxisTypes;
  private _isRtl: boolean = getRTL();
  private _calloutAnchorPoint: IGVBarChartSeriesPoint | null;
  private _barWidth: number;
  private _domainMargin: number;
  private _emptyChartId: string;
  private _groupWidth: number;
  private _xAxisInnerPadding: number;
  private _xAxisOuterPadding: number;
  private _cartesianChartRef: React.RefObject<IChart>;
  private _legendsRef: React.RefObject<ILegendContainer>;
  private _legendColorMap: Record<string, [string, string]> = {};
  private readonly Y_ORIGIN: number = 0;

  public constructor(props: IGroupedVerticalBarChartProps) {
    super(props);

    initializeComponentRef(this);

    this._createSet = memoizeFunction((data: IGroupedVerticalBarChartData[]) => this._createDataSetOfGVBC(data));
    this.state = {
      color: '',
      dataForHoverCard: 0,
      isCalloutVisible: false,
      refSelected: null,
      selectedLegends: props.legendProps?.selectedLegends || [],
      xCalloutValue: '',
      yCalloutValue: '',
      YValueHover: [],
      hoverXValue: '',
      calloutLegend: '',
      activeLegend: '',
    };
    warnDeprecations(COMPONENT_NAME, props, {
      showYAxisGridLines: 'Dont use this property. Lines are drawn by default',
      showXAxisPath: 'Dont use this property. Axis line removed default.',
      showYAxisPath: 'Dont use this property. No need to display Y axis path. Handling default',
      showXAxisGridLines: 'Dont use this property. Handling with default value.',
      legendColor: 'Dont use this property. colour will pick from given data.',
    });
    this._calloutId = getId('callout');
    this._tooltipId = getId('GVBCTooltipId_');
    this._emptyChartId = getId('_GVBC_empty');
    this._domainMargin = MIN_DOMAIN_MARGIN;
    this._cartesianChartRef = React.createRef();
    this._legendsRef = React.createRef();
  }

  public componentDidUpdate(prevProps: IGroupedVerticalBarChartProps): void {
    if (!areArraysEqual(prevProps.legendProps?.selectedLegends, this.props.legendProps?.selectedLegends)) {
      this.setState({
        selectedLegends: this.props.legendProps?.selectedLegends || [],
      });
    }
  }

  public render(): React.ReactNode {
    const points = this._addDefaultColors(this.props.data);
    this._xAxisType = getTypeOfAxis(points[0].name, true) as XAxisTypes;
    const { legends, xAxisLabels, datasetForBars } = this._createSet(points);
    this._legends = legends;
    this._xAxisLabels = xAxisLabels;
    this._datasetForBars = datasetForBars;
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const legendBars: JSX.Element = this._getLegendData();
    this._adjustProps();

    // The maxOfYVal prop is only required for the primary y-axis, so yMax should be calculated
    // using only the data points associated with the primary y-axis.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yMax = this._getMinMaxOfYAxis(this._datasetForBars).endValue;
    this._yMax = Math.max(yMax, this.props.yMaxValue || 0);
    this._classNames = getClassNames(this.props.styles!, {
      theme: this.props.theme!,
      href: this.props.href!,
    });
    const calloutProps = {
      target: this.state.refSelected,
      isCalloutVisible: this.state.isCalloutVisible,
      directionalHint: DirectionalHint.topAutoEdge,
      id: `toolTip${this._calloutId}`,
      gapSpace: 15,
      isBeakVisible: false,
      setInitialFocus: true,
      color: this.state.color,
      Legend: this.state.calloutLegend,
      XValue: this.state.xCalloutValue,
      YValue: this.state.yCalloutValue ? this.state.yCalloutValue : this.state.dataForHoverCard,
      YValueHover: this.state.YValueHover,
      hoverXValue: this.state.hoverXValue,
      onDismiss: this._closeCallout,
      ...this.props.calloutProps,
      preventDismissOnLostFocus: true,
      ...getAccessibleDataObject(this.state.callOutAccessibilityData, 'text', false),
    };
    const tickParams = {
      tickValues: this.props.tickValues!,
      tickFormat: this.props.tickFormat!,
    };

    return !this._isChartEmpty() ? (
      <CartesianChart
        {...this.props}
        chartTitle={this._getChartTitle()}
        points={this._datasetForBars}
        chartType={ChartTypes.GroupedVerticalBarChart}
        calloutProps={calloutProps}
        legendBars={legendBars}
        xAxisType={this._xAxisType}
        createYAxis={createNumericYAxis}
        datasetForXAxisDomain={this._xAxisLabels}
        tickParams={tickParams}
        getDomainNRangeValues={this._getDomainNRangeValues}
        getMinMaxOfYAxis={this._getMinMaxOfYAxis}
        createStringYAxis={createStringYAxis}
        tickPadding={this.props.tickPadding || 5}
        maxOfYVal={this._yMax}
        svgFocusZoneProps={{
          direction: FocusZoneDirection.horizontal,
        }}
        customizedCallout={this._getCustomizedCallout()}
        getmargins={this._getMargins}
        getGraphData={this._getGraphData}
        getAxisData={this._getAxisData}
        onChartMouseLeave={this._handleChartMouseLeave}
        getDomainMargins={this._getDomainMargins}
        {...(this._xAxisType === XAxisTypes.StringAxis && {
          xAxisInnerPadding: this._xAxisInnerPadding,
          xAxisOuterPadding: this._xAxisOuterPadding,
        })}
        barwidth={this._barWidth}
        ref={this._cartesianChartRef}
        /* eslint-disable react/jsx-no-bind */
        children={() => {
          return <g>{this._groupedVerticalBarGraph}</g>;
        }}
      />
    ) : (
      <div
        id={this._emptyChartId}
        role={'alert'}
        style={{ opacity: '0' }}
        aria-label={'Graph has no data to display'}
      />
    );
  }

  public get chartContainer(): HTMLElement | null {
    return this._cartesianChartRef.current?.chartContainer || null;
  }

  public toImage = (opts?: IImageExportOptions): Promise<string> => {
    return toImage(this._cartesianChartRef.current?.chartContainer, this._legendsRef.current?.toSVG, this._isRtl, opts);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _getMinMaxOfYAxis = (datasetForBars: any, yAxisType?: YAxisType, useSecondaryYScale?: boolean) => {
    const values: number[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    datasetForBars.forEach((data: any) => {
      data.groupSeries.forEach((point: IGVBarChartSeriesPoint) => {
        if (!useSecondaryYScale === !point.useSecondaryYScale) {
          values.push(point.data);
        }
      });
    });

    return { startValue: d3Min(values)!, endValue: d3Max(values)! };
  };

  private _getDomainNRangeValues = (
    points: IGroupedVerticalBarChartData[],
    margins: IMargins,
    width: number,
    chartType: ChartTypes,
    isRTL: boolean,
    xAxisType: XAxisTypes,
    barWidth: number,
    tickValues: Date[] | number[] | undefined,
    shiftX: number,
  ) => {
    let domainNRangeValue: IDomainNRange;
    if (xAxisType === XAxisTypes.NumericAxis || xAxisType === XAxisTypes.DateAxis) {
      domainNRangeValue = { dStartValue: 0, dEndValue: 0, rStartValue: 0, rEndValue: 0 };
    } else {
      domainNRangeValue = domainRangeOfXStringAxis(margins, width, isRTL);
    }
    return domainNRangeValue;
  };

  private _getGraphData = (
    xScale: StringAxis | NumericAxis,
    yScalePrimary: ScaleLinear<number, number>,
    containerHeight: number,
    containerWidth: number,
    xElement?: SVGElement | null,
    yAxisElement?: SVGElement | null,
    yScaleSecondary?: ScaleLinear<number, number>,
  ) => {
    const xScale0 = this._createX0Scale(containerWidth);

    // Setting the bar width here is safe because there are no dependencies earlier in the code
    // that rely on the width of bars in vertical bar charts with string x-axis.
    this._barWidth = getBarWidth(
      this.props.barwidth,
      this.props.maxBarWidth,
      calcBandwidth(xScale0.bandwidth(), this._legends.length, X1_INNER_PADDING),
    );
    this._groupWidth = calcRequiredWidth(this._barWidth, this._legends.length, X1_INNER_PADDING);

    const xScale1 = this._createX1Scale();
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const allGroupsBars: JSX.Element[] = [];
    this._datasetForBars.forEach((singleSet: IGVSingleDataPoint) => {
      allGroupsBars.push(
        this._buildGraph(singleSet, xScale0, xScale1, yScalePrimary, yScaleSecondary, containerHeight, xElement!),
      );
    });
    this._groupedVerticalBarGraph = allGroupsBars;
  };

  private _getMargins = (margins: IMargins) => (this.margins = margins);

  private _createDataSetOfGVBC = (points: IGroupedVerticalBarChartData[]) => {
    const legends = new Set<string>();
    const xAxisLabels: string[] = this._getOrderedXAxisLabels(points);
    points.forEach((point: IGroupedVerticalBarChartData) => {
      point.series.forEach((seriesPoint: IGVBarChartSeriesPoint) => {
        legends.add(seriesPoint.legend);
      });
    });
    const datasetForBars = this._createDataset(points);
    return {
      legends: Array.from(legends),
      xAxisLabels,
      datasetForBars,
    };
  };

  private _getCustomizedCallout = () => {
    return this.props.onRenderCalloutPerDataPoint
      ? this.props.onRenderCalloutPerDataPoint(this.state.dataPointCalloutProps)
      : null;
  };

  private _onBarHover = (
    pointData: IGVBarChartSeriesPoint,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    groupData: any,
    mouseEvent: React.MouseEvent<SVGElement>,
  ): void => {
    mouseEvent.persist();
    if (this._calloutAnchorPoint !== pointData) {
      this._calloutAnchorPoint = pointData;
      this.setState({
        refSelected: mouseEvent,
        /** Show the callout if highlighted bar is hovered and Hide it if unhighlighted bar is hovered */
        isCalloutVisible: this._noLegendHighlighted() || this._legendHighlighted(pointData.legend),
        calloutLegend: pointData.legend,
        dataForHoverCard: pointData.data,
        color: pointData.color,
        xCalloutValue: pointData.xAxisCalloutData,
        yCalloutValue: pointData.yAxisCalloutData,
        dataPointCalloutProps: pointData,
        callOutAccessibilityData: this.props.isCalloutForStack
          ? groupData.stackCallOutAccessibilityData
          : pointData.callOutAccessibilityData,
        YValueHover: groupData.groupSeries,
        hoverXValue: pointData.xAxisCalloutData,
      });
    }
  };

  private _onBarLeave = (): void => {
    /**/
  };

  private _handleChartMouseLeave = (): void => {
    this._calloutAnchorPoint = null;
    this.setState({ isCalloutVisible: false });
  };

  private _onBarFocus = (
    pointData: IGVBarChartSeriesPoint,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    groupData: any,
    focusEvent: React.FocusEvent<SVGElement>,
  ): void => {
    this.setState({
      refSelected: focusEvent.currentTarget,
      /** Show the callout if highlighted bar is focused and Hide it if unhighlighted bar is focused */
      isCalloutVisible: this._noLegendHighlighted() || this._legendHighlighted(pointData.legend),
      calloutLegend: pointData.legend,
      dataForHoverCard: pointData.data,
      color: pointData.color,
      xCalloutValue: pointData.xAxisCalloutData,
      yCalloutValue: pointData.yAxisCalloutData,
      dataPointCalloutProps: pointData,
      callOutAccessibilityData: this.props.isCalloutForStack
        ? groupData.stackCallOutAccessibilityData
        : pointData.callOutAccessibilityData,
      YValueHover: groupData.groupSeries,
      hoverXValue: pointData.xAxisCalloutData,
    });
  };

  private _redirectToUrl = (href: string | undefined): void => {
    href ? (window.location.href = href) : '';
  };

  private _buildGraph = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    singleSet: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    xScale0: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    xScale1: any,
    yScalePrimary: ScaleLinear<number, number>,
    yScaleSecondary: ScaleLinear<number, number> | undefined,
    containerHeight: number,
    xElement: SVGElement,
    // eslint-disable-next-line @typescript-eslint/no-deprecated
  ): JSX.Element => {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const singleGroup: JSX.Element[] = [];
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const barLabelsForGroup: JSX.Element[] = [];

    // Get the actual legends present at this x-axis point
    const presentLegends = Object.keys(singleSet).filter(key => key in this._legendColorMap);
    const effectiveGroupWidth = calcRequiredWidth(this._barWidth, presentLegends.length, X1_INNER_PADDING);

    // For stacked bars, center the single bar group in the available space
    // Instead of using the global legend position, use the local position within present legends
    const localScale = d3ScaleBand()
      .domain(presentLegends)
      .range(this._isRtl ? [effectiveGroupWidth, 0] : [0, effectiveGroupWidth])
      .paddingInner(X1_INNER_PADDING);
    this._legends.forEach((legendTitle: string, legendIndex: number) => {
      const barPoints = singleSet[legendTitle];
      if (barPoints) {
        const yBarScale = barPoints[0].useSecondaryYScale && yScaleSecondary ? yScaleSecondary : yScalePrimary;

        const xPoint = (localScale(legendTitle) ?? 0) + (localScale.bandwidth() - this._barWidth) / 2;
        const isLegendActive = this._legendHighlighted(legendTitle) || this._noLegendHighlighted();
        const barOpacity = isLegendActive ? '' : '0.1';

        let barTotalValue = 0;
        const yBaseline = yBarScale(this.Y_ORIGIN);
        let yPositiveStart = yBaseline;
        let yNegativeStart = yBaseline;
        let yPoint = this.Y_ORIGIN;

        barPoints.forEach((pointData: IGVBarChartSeriesPoint, pointIndex: number) => {
          if (!pointData.data) {
            // Not rendering data with 0.
            return;
          }
          const gradientId = getId('GVBC_Gradient') + `_${singleSet.indexNum}_${legendIndex}_${pointIndex}`;
          if (this.props.enableGradient) {
            const startColor = pointData.gradient?.[0] || pointData.color;
            const endColor = pointData.gradient?.[1] || pointData.color;

            singleGroup.push(
              <defs key={`defs_${gradientId}`}>
                <linearGradient id={gradientId} x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor={startColor} />
                  <stop offset="100%" stopColor={endColor} />
                </linearGradient>
              </defs>,
            );
          }

          const barGap = (VERTICAL_BAR_GAP / 2) * (pointIndex > 0 ? 2 : 0);
          const height = Math.max(yBarScale(this.Y_ORIGIN) - yBarScale(Math.abs(pointData.data)), MIN_BAR_HEIGHT);
          const pointColor = pointData.color; // Use the color of the current point

          if (pointData.data >= this.Y_ORIGIN) {
            yPositiveStart -= height + barGap;
            yPoint = yPositiveStart;
          } else {
            yPoint = yNegativeStart + barGap;
            yNegativeStart = yPoint + height;
          }

          singleGroup.push(
            <rect
              key={`${singleSet.indexNum}-${legendIndex}-${pointIndex}`}
              className={this._classNames.opacityChangeOnHover}
              height={height}
              width={this._barWidth}
              x={xPoint}
              y={yPoint}
              data-is-focusable={!this.props.hideTooltip && isLegendActive}
              opacity={barOpacity}
              fill={this.props.enableGradient ? `url(#${gradientId})` : pointColor}
              rx={this.props.roundCorners ? 3 : 0}
              onMouseOver={this._onBarHover.bind(this, pointData, singleSet)}
              onMouseMove={this._onBarHover.bind(this, pointData, singleSet)}
              onMouseOut={this._onBarLeave}
              onFocus={this._onBarFocus.bind(this, pointData, singleSet)}
              onBlur={this._onBarLeave}
              onClick={this.props.href ? this._redirectToUrl.bind(this, this.props.href!) : pointData.onClick}
              aria-label={this._getAriaLabel(pointData, singleSet.xAxisPoint)}
              role="img"
            />,
          );

          barTotalValue += pointData.data;
        });
        if (barTotalValue !== null && !this.props.hideLabels && this._barWidth >= 16 && isLegendActive) {
          barLabelsForGroup.push(
            <text
              key={`${singleSet.indexNum}-${legendIndex}`}
              x={xPoint + this._barWidth / 2}
              y={barTotalValue >= this.Y_ORIGIN ? yPositiveStart - 6 : yNegativeStart + 12}
              textAnchor="middle"
              className={this._classNames.barLabel}
              aria-hidden={true}
            >
              {typeof this.props.yAxisTickFormat === 'function'
                ? this.props.yAxisTickFormat(barTotalValue)
                : formatScientificLimitWidth(barTotalValue)}
            </text>,
          );
        }
      }
    });
    // Used to display tooltip at x axis labels.
    if (!this.props.wrapXAxisLables && this.props.showXAxisLablesTooltip) {
      const xAxisElement = d3Select(xElement).call(xScale0);
      try {
        document.getElementById(this._tooltipId) && document.getElementById(this._tooltipId)!.remove();
        // eslint-disable-next-line no-empty
      } catch (e) {}
      const tooltipProps = {
        tooltipCls: this._classNames.tooltip!,
        id: this._tooltipId,
        axis: xAxisElement,
      };
      xAxisElement && tooltipOfAxislabels(tooltipProps);
    }
    return (
      <g
        key={singleSet.indexNum}
        transform={`translate(${xScale0(singleSet.xAxisPoint) + (xScale0.bandwidth() - effectiveGroupWidth) / 2}, 0)`}
      >
        {singleGroup}
        {barLabelsForGroup}
      </g>
    );
  };

  private _createDataset = (points: IGroupedVerticalBarChartData[]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const datasetForBars: any = [];

    points.forEach((point: IGroupedVerticalBarChartData, index: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const singleDatasetPointForBars: any = {};
      const legendToBarPoint: Record<string, IGVBarChartSeriesPoint> = {};

      point.series.forEach((seriesPoint: IGVBarChartSeriesPoint) => {
        if (!singleDatasetPointForBars[seriesPoint.legend]) {
          singleDatasetPointForBars[seriesPoint.legend] = [{ ...seriesPoint }];
          legendToBarPoint[seriesPoint.legend] = { ...seriesPoint };
        } else {
          singleDatasetPointForBars[seriesPoint.legend].push({ ...seriesPoint });
          legendToBarPoint[seriesPoint.legend].data += seriesPoint.data;
        }
      });

      singleDatasetPointForBars.xAxisPoint = point.name;
      singleDatasetPointForBars.indexNum = index;
      singleDatasetPointForBars.groupSeries = Object.values(legendToBarPoint);
      singleDatasetPointForBars.stackCallOutAccessibilityData = point.stackCallOutAccessibilityData;
      datasetForBars.push(singleDatasetPointForBars);
    });
    return datasetForBars;
  };

  // For grouped vertical bar chart, First need to define total scale (from start to end)
  // From that need to define scale for single group of bars - done by createX1Scale
  private _createX0Scale = (containerWidth: number) => {
    const x0Axis = d3ScaleBand()
      .domain(this._xAxisLabels)
      .range(
        this._isRtl
          ? [containerWidth! - this.margins.right! - this._domainMargin, this.margins.left! + this._domainMargin]
          : [this.margins.left! + this._domainMargin, containerWidth! - this.margins.right! - this._domainMargin],
      )
      .paddingInner(this._xAxisInnerPadding)
      .paddingOuter(this._xAxisOuterPadding);
    return x0Axis;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _createX1Scale = (): any => {
    return (
      d3ScaleBand()
        .domain(this._legends)
        // When there is only one group, xScale0 adds padding around it,
        // causing the bandwidth to become smaller than the actual group width.
        // So to render bars in the group correctly, use groupWidth instead of the generated scale bandwidth.
        .range(this._isRtl ? [this._groupWidth, 0] : [0, this._groupWidth])
        .paddingInner(X1_INNER_PADDING)
    );
  };

  private _closeCallout = () => {
    this.setState({
      isCalloutVisible: false,
    });
  };

  private _onLegendHover(legendTitle: string): void {
    this.setState({
      activeLegend: legendTitle,
    });
  }

  private _onLegendLeave(): void {
    this.setState({
      activeLegend: '',
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-deprecated
  private _getLegendData = (): JSX.Element => {
    const actions: ILegend[] = [];

    this._legends.forEach((legendTitle: string) => {
      const legend: ILegend = {
        title: legendTitle,
        color: this._legendColorMap[legendTitle][0],
        hoverAction: () => {
          this._handleChartMouseLeave();
          this._onLegendHover(legendTitle);
        },
        onMouseOutAction: () => {
          this._onLegendLeave();
        },
      };

      actions.push(legend);
    });
    return (
      <Legends
        legends={actions}
        overflowProps={this.props.legendsOverflowProps}
        enabledWrapLines={this.props.enabledLegendsWrapLines}
        focusZonePropsInHoverCard={this.props.focusZonePropsForLegendsInHoverCard}
        {...this.props.legendProps}
        onChange={this._onLegendSelectionChange.bind(this)}
        ref={this._legendsRef}
      />
    );
  };

  private _onLegendSelectionChange(
    selectedLegends: string[],
    event: React.MouseEvent<HTMLButtonElement>,
    currentLegend?: ILegend,
  ): void {
    if (this.props.legendProps?.canSelectMultipleLegends) {
      this.setState({ selectedLegends });
    } else {
      this.setState({ selectedLegends: selectedLegends.slice(-1) });
    }
    if (this.props.legendProps?.onChange) {
      this.props.legendProps.onChange(selectedLegends, event, currentLegend);
    }
  }

  private _getAxisData = (yAxisData: IAxisData) => {
    if (yAxisData && yAxisData.yAxisDomainValues.length) {
      const { yAxisDomainValues: domainValue } = yAxisData;
      this._yMax = Math.max(domainValue[domainValue.length - 1], this.props.yMaxValue || 0);
    }
  };

  /**
   * This function checks if the given legend is highlighted or not.
   * A legend can be highlighted in 2 ways:
   * 1. selection: if the user clicks on it
   * 2. hovering: if there is no selected legend and the user hovers over it
   */
  private _legendHighlighted = (legendTitle: string) => {
    return this._getHighlightedLegend().includes(legendTitle!);
  };

  /**
   * This function checks if none of the legends is selected or hovered.
   */
  private _noLegendHighlighted = () => {
    return this._getHighlightedLegend().length === 0;
  };

  private _getHighlightedLegend() {
    return this.state.selectedLegends.length > 0
      ? this.state.selectedLegends
      : this.state.activeLegend
      ? [this.state.activeLegend]
      : [];
  }

  private _getAriaLabel = (point: IGVBarChartSeriesPoint, xAxisPoint: string): string => {
    const xValue = point.xAxisCalloutData || xAxisPoint;
    const legend = point.legend;
    const yValue = point.yAxisCalloutData || point.data;
    return point.callOutAccessibilityData?.ariaLabel || `${xValue}. ${legend}, ${yValue}.`;
  };

  private _getDomainMargins = (containerWidth: number): IMargins => {
    this._domainMargin = MIN_DOMAIN_MARGIN;

    /** Total width available to render the bars */
    const totalWidth = calcTotalWidth(containerWidth, this.margins, MIN_DOMAIN_MARGIN);

    if (this._xAxisType === XAxisTypes.StringAxis) {
      if (isScalePaddingDefined(this.props.xAxisOuterPadding)) {
        // Setting the domain margin for string x-axis to 0 because the xAxisOuterPadding prop is now available
        // to adjust the space before the first group and after the last group.
        this._domainMargin = 0;
      } else if (this.props.barwidth !== 'auto') {
        // Update the bar width so that when CartesianChart rerenders,
        // the following calculations don't use the previous bar width.
        this._barWidth = getBarWidth(this.props.barwidth, this.props.maxBarWidth);
        const groupWidth = calcRequiredWidth(this._barWidth, this._legends.length, X1_INNER_PADDING);
        /** Total width required to render the groups. Directly proportional to group width */
        const reqWidth = calcRequiredWidth(groupWidth, this._xAxisLabels.length, this._xAxisInnerPadding);

        if (totalWidth >= reqWidth) {
          // Center align the chart by setting equal left and right margins for domain
          this._domainMargin = MIN_DOMAIN_MARGIN + (totalWidth - reqWidth) / 2;
        }
      } else if (this.props.mode === 'plotly' && this._xAxisLabels.length > 1) {
        // Calculate the remaining width after rendering groups at their maximum allowable width
        const groupBandwidth = calcBandwidth(totalWidth, this._xAxisLabels.length, this._xAxisInnerPadding);
        const barBandwidth = calcBandwidth(groupBandwidth, this._legends.length, X1_INNER_PADDING);
        const barWidth = getBarWidth(this.props.barwidth, this.props.maxBarWidth, barBandwidth);
        const groupWidth = calcRequiredWidth(barWidth, this._legends.length, X1_INNER_PADDING);
        let reqWidth = calcRequiredWidth(groupWidth, this._xAxisLabels.length, this._xAxisInnerPadding);
        const margin1 = (totalWidth - reqWidth) / 2;

        // Calculate the remaining width after accounting for the space required to render x-axis labels
        const step = calculateLongestLabelWidth(this._xAxisLabels) + 20;
        reqWidth = (this._xAxisLabels.length - this._xAxisInnerPadding) * step;
        const margin2 = (totalWidth - reqWidth) / 2;

        this._domainMargin = MIN_DOMAIN_MARGIN + Math.max(0, Math.min(margin1, margin2));
      }
    }

    return {
      ...this.margins,
      left: this.margins.left! + this._domainMargin,
      right: this.margins.right! + this._domainMargin,
    };
  };

  private _isChartEmpty(): boolean {
    return !(
      this.props.data &&
      this.props.data.length > 0 &&
      this.props.data.filter((item: IGroupedVerticalBarChartData) => item.series.length).length > 0
    );
  }

  private _adjustProps(): void {
    this._barWidth = getBarWidth(this.props.barwidth, this.props.maxBarWidth);
    // x0_inner_padding = space_between_groups / (space_between_groups + group_width)
    // space_between_groups = 2 * bar_width
    // group_width = this._legends.length * bar_width + (this._legends.length - 1) * space_between_bars
    this._xAxisInnerPadding = getScalePadding(
      this.props.xAxisInnerPadding,
      undefined,
      2 / (2 + calcTotalBandUnits(this._legends.length, X1_INNER_PADDING)),
    );
    this._xAxisOuterPadding = getScalePadding(this.props.xAxisOuterPadding);
  }

  private _getChartTitle = (): string => {
    const { chartTitle } = this.props;
    return (
      (chartTitle ? `${chartTitle}. ` : '') +
      `Vertical bar chart with ${this._xAxisLabels.length} groups of ${this._legends.length} bars each. `
    );
  };

  // Lighten/Darken a color by a given percentage using d3-scale
  private _adjustColor = (color: string, percentage: number, lightenColor: boolean, isDarkTheme: boolean): string => {
    const targetColor = lightenColor ? (isDarkTheme ? '#000000' : '#ffffff') : isDarkTheme ? '#ffffff' : '#000000';
    const colorInterpolator = d3ScaleLinear<string>().domain([0, 1]).range([color, targetColor]);
    return rgb(colorInterpolator(percentage)).formatRgb();
  };

  private _addDefaultColors = (data?: IGroupedVerticalBarChartData[]): IGroupedVerticalBarChartData[] => {
    this._legendColorMap = {};
    let colorIndex = 0;

    return (
      data?.map(point => {
        return {
          ...point,
          series:
            point.series?.map(seriesPoint => {
              let startColor = seriesPoint.color
                ? seriesPoint.color
                : getNextColor(colorIndex, 0, this.props.theme?.isInverted);
              let endColor = startColor;

              if (this.props.enableGradient) {
                if (seriesPoint.color) {
                  // Generate gradient colors based on seriesPoint.color
                  startColor = this._adjustColor(
                    seriesPoint.color || endColor,
                    0.2,
                    false,
                    this.props.theme?.isInverted!,
                  );
                  endColor = this._adjustColor(
                    seriesPoint.color || startColor,
                    0.2,
                    true,
                    this.props.theme?.isInverted!,
                  );
                } else {
                  const nextGradient = getNextGradient(colorIndex, 0, this.props.theme?.isInverted);
                  startColor = seriesPoint.gradient?.[0] || nextGradient[0];
                  endColor = seriesPoint.gradient?.[1] || nextGradient[1];
                }
              }
              const pointGradient: [string, string] = [startColor, endColor];
              if (!this._legendColorMap[seriesPoint.legend]) {
                this._legendColorMap[seriesPoint.legend] = [startColor, endColor];
              }
              colorIndex += 1;

              return {
                ...seriesPoint,
                color: seriesPoint.color ?? this._legendColorMap[seriesPoint.legend][0],
                ...(this.props.enableGradient ? { gradient: pointGradient } : {}),
              };
            }) ?? [],
        };
      }) ?? []
    );
  };

  private _getOrderedXAxisLabels = (points: IGroupedVerticalBarChartData[]) => {
    if (this._xAxisType !== XAxisTypes.StringAxis) {
      return [];
    }

    return sortAxisCategories(this._mapCategoryToValues(points), this.props.xAxisCategoryOrder);
  };

  private _mapCategoryToValues = (points: IGroupedVerticalBarChartData[]) => {
    const categoryToValues: Record<string, number[]> = {};
    points.forEach(point => {
      if (!categoryToValues[point.name]) {
        categoryToValues[point.name] = [];
      }
      point.series.forEach(seriesPoint => {
        categoryToValues[point.name].push(seriesPoint.data);
      });
    });
    return categoryToValues;
  };
}
