class histogram {
  constructor(_parent, _props, _data) {
    this.parent = _parent;
    this.props = {
      data: _props.data,
      margin: _props.margin,
      xAxisLabel: _props.xAxisLabel,
      yAxisLabel: _props.yAxisLabel,
      onClick: _props.onClick,
      colourScale: _props.colourScale,
      onHoverOn: _props.onHoverOn,
      onHoverOff: _props.onHoverOff,
      formatID: _props.formatID,
    };
    this.initVis();
  }

  initVis() {
    let vis = this;
    // initialize margins
    const width = +vis.parent.attr('width');
    const height = +vis.parent.attr('height');
    vis.innerWidth = width - vis.props.margin.left - vis.props.margin.right;
    vis.innerHeight = height - vis.props.margin.top - vis.props.margin.bottom;
    vis.chart = this.parent
      .selectAll('.chart')
      .attr(
        'transform',
        `translate(${this.props.margin.left},${this.props.margin.top})`
      );
  }

  // some of the structure taken from grouped bar plot: https://d3-graph-gallery.com/graph/barplot_grouped_basicWide.html
  updateVis() {

    let vis = this;

    vis.parent
      .selectAll('.chart')
      .attr(
        'transform',
        `translate(${this.props.margin.left},${this.props.margin.top})`
      );

    //Get a list of all the festivals
    var festivals = new Set();
    this.props.data.forEach((d) => {
      festivals.add(d.festival);
    });

    let maxIndex = 0; // This will be used for our y axis range

    // produce index's for genders displaying the grouped bars
    festivals.forEach((festival) => {
      let indexFemale = 0;
      let indexOther = 0;
      this.props.data.forEach((d) => {
        if (d.festival == festival) {
          if ((d.gender == 'f') | (d.gender == 'mixed')) {
            d.index_histogram = indexFemale; // assign a new 'index' property to the object
            indexFemale += 1;
          } else {
            d.index_histogram = indexOther; // assign a new 'index' property to the object
            indexOther += 1;
          }
        }
      });
      maxIndex = maxIndex > indexOther ? maxIndex : indexOther; //we always know female will be in minority
    });


    // Sort data in ascending order of percentage difference between performers

    // 1. Group the data
    const groupData = d3.rollup(
      this.props.data,
      (v) => v.length,
      (d) => d.festival,
      (d) => d.gender
    );
    const totals = d3.rollup(
      this.props.data,
      (v) => v.length,
      (d) => d.festival
    );

    // 2. Calculate the order and sort the festivalSorted Array
    const dataToDisplay = Array.from(festivals);
    dataToDisplay.sort((a, b) => {
      const womenForFestival_a =
        (groupData.get(a).get('f') ?? 0) + (groupData.get(a).get('mixed') ?? 0) / totals.get(a)
      const womenForFestival_b =
        (groupData.get(b).get('f') ?? 0) + (groupData.get(b).get('mixed') ?? 0) / totals.get(b)

      return d3.ascending(womenForFestival_a, womenForFestival_b);
    });

    // Initialise scales
    var xScale = d3
      .scaleBand()
      .domain(dataToDisplay)
      .range([0, this.innerWidth])
      .padding([0.1])

    const yScale = d3
      .scaleLinear()
      .domain([0, maxIndex])
      .range([this.innerHeight, 0]);

    // initialize axis
    const xAxis = d3.axisBottom(xScale).ticks(festivals).tickSize(0)

    const yAxis = d3
      .axisLeft(yScale)
      .ticks(20)
      .tickSizeOuter(0)
      .tickSizeInner(-this.innerWidth, 0, 0);

    // Append empty x-axis group and move it to the bottom of the chart
    const xAxisG = this.chart
      .append('g')
      .attr('class', 'axis x-axis')
      .attr('transform', `translate(0,${this.innerHeight})`)
      .attr('class', 'histogram');

    // https://stackoverflow.com/questions/20947488/d3-grouped-bar-chart-how-to-rotate-the-text-of-x-axis-ticks
    // Add x axis labels and ticks
    xAxisG
      .call(xAxis)
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.4em')
      .attr('dy', '.45em')
      .attr('transform', 'rotate(-40)')
      .attr('class', 'axis label')

    // Add y-axis 
    const yAxisG = vis.chart
      .append('g')
      .attr('class', 'axis y-axis')
      .attr('class', 'histogram');
    yAxisG.call(yAxis);

    // Add y axis titles
    yAxisG
      .append('text')
      .attr('class', 'axis title')
      .attr('y', -20)
      .attr('x', 0)
      .attr('text-anchor', 'middle')
      .text(this.props.yAxisLabel);

    // Add x axis titles
    xAxisG
      .append('text')
      .attr('class', 'axis title')
      .attr('y', 100)
      .attr('x', this.innerWidth / 2)
      .attr('text-anchor', 'end')
      .text(this.props.xAxisLabel);

    // Another scale for subgroup position?
    var xSubgroup = d3
      .scaleBand()
      .domain(['f', 'other'])
      .range([0, xScale.bandwidth()])
      .padding([0.05])

    // Create new circles for each group
    const g = vis.chart;
    vis.chart.selectAll('rect').each(function () {
      g.append(() => this);
    });

    //create the new circle elements
    const rect = vis.chart
      .selectAll('rect')
      .data(this.props.data, (d) => d.stage_name);

    //append a new circle for each data element
    const rectEnter = rect.enter().append('rect');

    const tooltipPadding = 25;
    const rectHeight = vis.innerHeight / maxIndex +1;

    //plot rectangles
    rectEnter
      .merge(rect)
      .attr('id', (d) => vis.props.formatID(d.stage_name))
      .attr('class', 'histogram')
      .on('mousemove', (event, d) => {
        d3.select('#tooltip')
          .style('display', 'inline-block')
          .style('left', event.pageX + tooltipPadding + 'px')
          .style('top', event.pageY + tooltipPadding + 'px')
          .html('<div class="tooltip-title">' + d.stage_name + '</div>');
          this.props.onHoverOn(d.stage_name)
      })
      .on('mouseleave', (_event, d) => {
        d3.select('#tooltip').style('display', 'none');
        this.props.onHoverOff(d.stage_name, d.genderGroup)
      })
      .on('click', (_event, d) => this.props.onClick(d.stage_name))
      .attr('x', (d) => {
        return (
          xScale(d.festival) +
          xSubgroup((d.gender == 'f') | (d.gender == 'mixed') ? 'f' : 'other') 
        );
      })
      .attr('width', 20)
      .attr('y', vis.innerHeight)
      .attr('fill', (d) => vis.props.colourScale(d.genderGroup))
      .transition('bars grow up from x axis')
      .duration(1000)
      .delay((d, i) => {
        if ((d.gender == 'f') | (d.gender == 'mixed')) {
          return yScale(maxIndex - d.index_histogram * 10) / 2;
        } else {
          return 3000 + yScale(maxIndex - d.index_histogram * 10) / 2; // more delay for the male bars
        }
      })
      .attr('y', (d) =>  yScale(d.index_histogram) - rectHeight) 
      .attr('height', rectHeight)
      .transition('stroke to white')
      .duration(100)
      .delay(1000)
      .attr('stroke', 'white')

    rect.exit().remove();
  }

}
