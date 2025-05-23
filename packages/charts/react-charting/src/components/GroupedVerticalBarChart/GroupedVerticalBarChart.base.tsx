import * as React from 'react';
import { max as d3Max, min as d3Min } from 'd3-array';
import { select as d3Select } from 'd3-selection';
import { Axis as D3Axis } from 'd3-axis';
import { ScaleLinear, scaleBand as d3ScaleBand } from 'd3-scale';
import {
  classNamesFunction,
  getId,
  getRTL,
  initializeComponentRef,
  memoizeFunction,
  warnDeprecations,
} from '@fluentui/react/lib/Utilities';
import { IProcessedStyleSet, IPalette } from '@fluentui/react/lib/Styling';
import { DirectionalHint } from '@fluentui/react/lib/Callout';
import { FocusZoneDirection } from '@fluentui/react-focus';
import {
  ChartTypes,
  IAxisData,
  getAccessibleDataObject,
  tooltipOfXAxislabels,
  XAxisTypes,
  getTypeOfAxis,
  formatValueWithSIPrefix,
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
  IRefArrayData,
  Legends,
} from '../../index';
import { IChart, IImageExportOptions } from '../../types/index';
import { toImage } from '../../utilities/image-export-utils';
import { ILegendContainer } from '../Legends/index';

const COMPONENT_NAME = 'GROUPED VERTICAL BAR CHART';
const getClassNames = classNamesFunction<IGroupedVerticalBarChartStyleProps, IGroupedVerticalBarChartStyles>();
type StringAxis = D3Axis<string>;
type NumericAxis = D3Axis<number | { valueOf(): number }>;

const MIN_DOMAIN_MARGIN = 8;
const X1_INNER_PADDING = 0.1;
// x1_inner_padding = space_between_bars / (space_between_bars + bar_width)
// => space_between_bars = (x1_inner_padding / (1 - x1_inner_padding)) * bar_width
/** Rate at which the space between the bars in a group changes wrt the bar width */
const BAR_GAP_RATE = X1_INNER_PADDING / (1 - X1_INNER_PADDING);

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
  };

  private _createSet: (
    data: IGroupedVerticalBarChartData[],
  ) => // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { keys: string[]; xAxisLabels: string[]; datasetForBars: any };
  private _keys: string[];
  private _xAxisLabels: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _datasetForBars: any;
  private margins: IMargins;
  private _groupedVerticalBarGraph: JSX.Element[];
  private _classNames: IProcessedStyleSet<IGroupedVerticalBarChartStyles>;
  private _refArray: IRefArrayData[];
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
    this._refArray = [];
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
    const points = this.props.data;
    const { keys, xAxisLabels, datasetForBars } = this._createSet(points);
    this._keys = keys;
    this._xAxisLabels = xAxisLabels;
    this._datasetForBars = datasetForBars;
    this._xAxisType = getTypeOfAxis(points[0].name, true) as XAxisTypes;
    const legends: JSX.Element = this._getLegendData(points, this.props.theme!.palette);
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
        legendBars={legends}
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
      xScale0.bandwidth() / (this._keys.length + (this._keys.length - 1) * BAR_GAP_RATE),
    );
    this._groupWidth = (this._keys.length + (this._keys.length - 1) * BAR_GAP_RATE) * this._barWidth;

    const xScale1 = this._createX1Scale();
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
    const keys: string[] = [];
    const xAxisLabels: string[] = points.map(singlePoint => singlePoint.name);
    points[0].series.forEach((singleKey: IGVBarChartSeriesPoint) => {
      keys.push(singleKey.key);
    });
    const datasetForBars = this._createDataset(points);
    return {
      keys,
      xAxisLabels,
      datasetForBars,
    };
  };

  private _getCustomizedCallout = () => {
    return this.props.onRenderCalloutPerDataPoint
      ? this.props.onRenderCalloutPerDataPoint(this.state.dataPointCalloutProps)
      : null;
  };

  private _getOpacity = (legendTitle: string): string => {
    const opacity = this._legendHighlighted(legendTitle) || this._noLegendHighlighted() ? '' : '0.1';
    return opacity;
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
    refArrayIndexNumber: number,
  ): void => {
    this._refArray.forEach((obj: IRefArrayData, index: number) => {
      if (obj.index === pointData.legend && refArrayIndexNumber === index) {
        this.setState({
          refSelected: obj.refElement,
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
      }
    });
  };

  private _redirectToUrl = (href: string | undefined): void => {
    href ? (window.location.href = href) : '';
  };

  private _refCallback(element: SVGRectElement, legendTitle: string, refIndexNumber: number): void {
    this._refArray[refIndexNumber] = { index: legendTitle, refElement: element };
  }

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
  ): JSX.Element => {
    const singleGroup: JSX.Element[] = [];
    const barLabelsForGroup: JSX.Element[] = [];

    const tempDataSet = Object.keys(this._datasetForBars[0]).splice(0, this._keys.length);
    tempDataSet.forEach((datasetKey: string, index: number) => {
      const refIndexNumber = singleSet.indexNum * tempDataSet.length + index;
      const pointData = singleSet[datasetKey];
      if (pointData) {
        const yBarScale = pointData.useSecondaryYScale && yScaleSecondary ? yScaleSecondary : yScalePrimary;

        // To align the centers of the generated bandwidth and the calculated one when they differ,
        // use the following addend.
        const xPoint = xScale1(datasetKey) + (xScale1.bandwidth() - this._barWidth) / 2;
        const yPoint = Math.max(yBarScale(pointData.data), 0);
        let startColor = pointData.color ? pointData.color : getNextColor(index, 0, this.props.theme?.isInverted);
        let endColor = startColor;

        if (this.props.enableGradient) {
          startColor = pointData.gradient?.[0] || getNextGradient(index, 0, this.props.theme?.isInverted)[0];
          endColor = pointData.gradient?.[1] || getNextGradient(index, 0, this.props.theme?.isInverted)[1];
          pointData.color = startColor;
        }

        const gradientId = getId('GVBC_Gradient') + `_${singleSet.indexNum}_${index}`;

        // Not rendering data with 0.
        pointData.data &&
          singleGroup.push(
            <React.Fragment key={`${singleSet.indexNum}-${index}`}>
              {this.props.enableGradient && (
                <defs>
                  <linearGradient id={gradientId} x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0" stopColor={startColor} />
                    <stop offset="100%" stopColor={endColor} />
                  </linearGradient>
                </defs>
              )}
              <rect
                className={this._classNames.opacityChangeOnHover}
                height={Math.max(containerHeight! - this.margins.bottom! - yBarScale(pointData.data), 0)}
                width={this._barWidth}
                x={xPoint}
                y={yPoint}
                data-is-focusable={
                  !this.props.hideTooltip && (this._legendHighlighted(pointData.legend) || this._noLegendHighlighted())
                }
                opacity={this._getOpacity(pointData.legend)}
                ref={(e: SVGRectElement | null) => {
                  this._refCallback(e!, pointData.legend, refIndexNumber);
                }}
                fill={this.props.enableGradient ? `url(#${gradientId})` : startColor}
                rx={this.props.roundCorners ? 3 : 0}
                onMouseOver={this._onBarHover.bind(this, pointData, singleSet)}
                onMouseMove={this._onBarHover.bind(this, pointData, singleSet)}
                onMouseOut={this._onBarLeave}
                onFocus={this._onBarFocus.bind(this, pointData, singleSet, refIndexNumber)}
                onBlur={this._onBarLeave}
                onClick={this.props.href ? this._redirectToUrl.bind(this, this.props.href!) : pointData.onClick}
                aria-label={this._getAriaLabel(pointData, singleSet.xAxisPoint)}
                role="img"
              />
            </React.Fragment>,
          );
        if (
          pointData.data &&
          !this.props.hideLabels &&
          this._barWidth >= 16 &&
          (this._legendHighlighted(pointData.legend) || this._noLegendHighlighted())
        ) {
          barLabelsForGroup.push(
            <text
              key={`${singleSet.indexNum}-${index}`}
              x={xPoint + this._barWidth / 2}
              y={yPoint - 6}
              textAnchor="middle"
              className={this._classNames.barLabel}
              aria-hidden={true}
            >
              {formatValueWithSIPrefix(pointData.data)}
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
        xAxis: xAxisElement,
      };
      xAxisElement && tooltipOfXAxislabels(tooltipProps);
    }
    return (
      <g
        key={singleSet.indexNum}
        transform={`translate(${xScale0(singleSet.xAxisPoint) + (xScale0.bandwidth() - this._groupWidth) / 2}, 0)`}
      >
        {singleGroup}
        {barLabelsForGroup}
      </g>
    );
  };

  private _createDataset = (points: IGroupedVerticalBarChartData[]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const datasetForBars: any = [];
    const dataset: IGVDataPoint[] = [];

    points.forEach((point: IGroupedVerticalBarChartData, index: number) => {
      const singleDatasetPoint: IGVDataPoint = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const singleDatasetPointForBars: any = {};
      const singleDataSeries: IGVBarChartSeriesPoint[] = [];

      point.series.forEach((seriesPoint: IGVBarChartSeriesPoint, seriesIndex) => {
        if (this.props.enableGradient) {
          seriesPoint.color =
            seriesPoint.gradient?.[0] || getNextGradient(seriesIndex, 0, this.props.theme?.isInverted)[0];
        }
        singleDatasetPoint[seriesPoint.key] = seriesPoint.data;
        singleDatasetPointForBars[seriesPoint.key] = {
          ...seriesPoint,
        };
        singleDataSeries.push(seriesPoint);
      });

      singleDatasetPointForBars.xAxisPoint = point.name;
      singleDatasetPointForBars.indexNum = index;
      singleDatasetPointForBars.groupSeries = singleDataSeries;
      singleDatasetPointForBars.stackCallOutAccessibilityData = point.stackCallOutAccessibilityData;
      datasetForBars.push(singleDatasetPointForBars);
      dataset.push(singleDatasetPoint);
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
        .domain(this._keys)
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

  private _getLegendData = (points: IGroupedVerticalBarChartData[], palette: IPalette): JSX.Element => {
    const data = points;
    const defaultPalette: string[] = [palette.blueLight, palette.blue, palette.blueMid, palette.red, palette.black];
    const actions: ILegend[] = [];

    data.forEach((singleChartData: IGroupedVerticalBarChartData) => {
      singleChartData.series.forEach((point: IGVBarChartSeriesPoint) => {
        let color: string = point.color ? point.color : defaultPalette[Math.floor(Math.random() * 4 + 1)];
        if (this.props.enableGradient) {
          const pointIndex = Math.max(singleChartData.series?.findIndex(item => item.legend === point.legend) || 0, 0);
          color = point.gradient?.[0] || getNextGradient(pointIndex, 0, this.props.theme?.isInverted)[0];
        }
        const checkSimilarLegends = actions.filter((leg: ILegend) => leg.title === point.legend && leg.color === color);
        if (checkSimilarLegends!.length > 0) {
          return;
        }
        const legend: ILegend = {
          title: point.legend,
          color,
          hoverAction: () => {
            this._handleChartMouseLeave();
            this._onLegendHover(point.legend);
          },
          onMouseOutAction: () => {
            this._onLegendLeave();
          },
        };

        actions.push(legend);
      });
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
    const totalWidth =
      containerWidth - (this.margins.left! + MIN_DOMAIN_MARGIN) - (this.margins.right! + MIN_DOMAIN_MARGIN);
    /** Rate at which the space between the groups changes wrt the group width */
    const groupGapRate = this._xAxisInnerPadding / (1 - this._xAxisInnerPadding);

    if (this._xAxisType === XAxisTypes.StringAxis) {
      if (isScalePaddingDefined(this.props.xAxisOuterPadding)) {
        // Setting the domain margin for string x-axis to 0 because the xAxisOuterPadding prop is now available
        // to adjust the space before the first group and after the last group.
        this._domainMargin = 0;
      } else if (this.props.barwidth !== 'auto') {
        // Update the bar width so that when CartesianChart rerenders,
        // the following calculations don't use the previous bar width.
        this._barWidth = getBarWidth(this.props.barwidth, this.props.maxBarWidth);
        const groupWidth = (this._keys.length + (this._keys.length - 1) * BAR_GAP_RATE) * this._barWidth;
        /** Total width required to render the groups. Directly proportional to group width */
        const reqWidth = (this._xAxisLabels.length + (this._xAxisLabels.length - 1) * groupGapRate) * groupWidth;

        if (totalWidth >= reqWidth) {
          // Center align the chart by setting equal left and right margins for domain
          this._domainMargin = MIN_DOMAIN_MARGIN + (totalWidth - reqWidth) / 2;
        }
      } else if (this.props.mode === 'plotly' && this._xAxisLabels.length > 1) {
        // Calculate the remaining width after rendering groups at their maximum allowable width
        const groupBandwidth = totalWidth / (this._xAxisLabels.length + (this._xAxisLabels.length - 1) * groupGapRate);
        const barBandwidth = groupBandwidth / (this._keys.length + (this._keys.length - 1) * BAR_GAP_RATE);
        const barWidth = getBarWidth(this.props.barwidth, this.props.maxBarWidth, barBandwidth);
        const groupWidth = (this._keys.length + (this._keys.length - 1) * BAR_GAP_RATE) * barWidth;
        let reqWidth = (this._xAxisLabels.length + (this._xAxisLabels.length - 1) * groupGapRate) * groupWidth;
        const margin1 = (totalWidth - reqWidth) / 2;

        let margin2 = Number.POSITIVE_INFINITY;
        if (!this.props.hideTickOverlap) {
          // Calculate the remaining width after accounting for the space required to render x-axis labels
          const step = calculateLongestLabelWidth(this._xAxisLabels) + 20;
          reqWidth = (this._xAxisLabels.length - this._xAxisInnerPadding) * step;
          margin2 = (totalWidth - reqWidth) / 2;
        }

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
    // group_width = this._keys.length * bar_width + (this._keys.length - 1) * space_between_bars
    this._xAxisInnerPadding = getScalePadding(
      this.props.xAxisInnerPadding,
      undefined,
      2 / (2 + this._keys.length + (this._keys.length - 1) * BAR_GAP_RATE),
    );
    this._xAxisOuterPadding = getScalePadding(this.props.xAxisOuterPadding);
  }

  private _getChartTitle = (): string => {
    const { chartTitle } = this.props;
    return (
      (chartTitle ? `${chartTitle}. ` : '') +
      `Vertical bar chart with ${this._xAxisLabels.length} groups of ${this._keys.length} bars each. `
    );
  };
}
