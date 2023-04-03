import './App.css';
import React, {useState} from "react";
import * as d3 from "d3";

function App() {

    // region Selector Lists
    const markets = [
        'EURUSD',
        'USDJPY',
        'GBPUSD',
        'AUDUSD',
        'USDCAD',
        'USDCHF',
        'NZDUSD',
        'EURJPY',
        'GBPJPY',
        'EURGBP',
    ];
    const timeframes = [
        /*'1m',
        '5m',
        '15m',
        '30m',*/
        '1h',
        '1d',
        '5d',
        '1wk',
        '1mo',
    ];
    const charttypes = [
        'Bars',
        'Candles',
        'Hollow',
        'Columns',
        'Line',
        'Area',
        'Baseline',
        'High-Low',
    ];
    const indicators = [
        'Ichimoku',
        'MACD',
        'RSI',
        'ATR',
        'EMA',
        'SMA',
        'Bollinger Bands'
    ];
    // endregion

    // region Dynamic Selector Variables | Functions
    const [selectedMarket, setSelectedMarket] = useState('EURUSD')
    const [selectedTime, setSelectedTime] = useState('1wk')
    function handleMarketChange(e){
        setSelectedMarket(e.target.value)
    }
    function handleTimeChange(e){
        setSelectedTime(e.target.value)
    }
    // endregion

    // region Chart Generator
    fetch(`http://127.0.0.1:5069/chart/${selectedMarket}=X/${selectedTime}`)
        .then(r => r.json())
        .then(d => drawChart(d))

    function drawChart(data) {
        let green = '#4eb72c',
            red = '#ff3737'
        console.log(data)
        let df = [];
        for (let i in data.index) {
            df.push(
                {
                    id: data.index[i],
                    date: data.Date[i],
                    open: data.Open[i],
                    high: data.High[i],
                    low: data.Low[i],
                    close: data.Close[i],
                    o_signal: data.osignal[i],
                    h_signal: data.hsignal[i],
                    l_signal: data.lsignal[i],
                    c_signal: data.csignal[i],
                }
            )
        }

        console.log(df)

        let w = document.getElementById('chart').offsetWidth,
            h = document.getElementById('chart').offsetHeight - 50,
            m = 30,
            Mh = h - m*2,
            Mw = w - m*2;

        d3.select('.container').remove()
        d3.select('.tooltip').remove()

        let svg = d3.select('#chart')
            .append('svg')
            .attr('height', h)
            .attr('width', w)
            .attr('class', 'container')
            .append('g')
            .attr('transform', `translate(${m},${m})`);

        let getFrom = (d, key) => {
            let keylist = []
            for (let i = 0; i < d.length; i++) {
                keylist.push(d[i][key]);
            }
            return keylist;
        }
        let minMax = d => {
            let mmlist = [];
            mmlist.push(...getFrom(d,'open'));
            mmlist.push(...getFrom(d,'high'));
            mmlist.push(...getFrom(d,'low'));
            mmlist.push(...getFrom(d,'close'));
            let min = (Math.min(...mmlist))-0.005,
                max = Math.max(...mmlist)+0.005;
            return [min, max];
        }
        const x = d3.scaleBand()
            .domain(getFrom(df,'id'))
            .range([0,Mw]);

        svg.append('g')
            .attr(
                'transform',
                `translate(0, ${Mh})`
            )
            .call(d3.axisBottom(x));

        const y = d3.scaleLinear()
            .domain(minMax(df))
            .range([Mh,0]);

        svg.append('g')
            .attr(
                'transform',
                `translate(${Mw}, 0)`
            )
            .call(d3.axisRight(y))

        let tooltip = d3.select('#chart')
            .append('div')
            .style('opacity', 0)
            .attr('class', 'tooltip')
            .style('background-color', 'white')
            .style('border-radius', '10px')
            .style('border', 'solid')
            .style('border-width', '1px')
            .style('margin-top', '10px')
            .style('padding', '20px');

        let mouseover = function(d) {
            tooltip.style('opacity', 1)
            d3.selectAll('candle')
                .style('opacity', 0.5)
            d3.select(this)
                .style('opacity', 1)
                .style('stroke', 'black');
        }

        let colorAssign = (d, k) => {
            return d[k] === 1 ? green : red;
        }
        let mousemove = function(e,d) {
            tooltip.html(
                `
            Open: <div style="color:${colorAssign(d, 'o_signal')}">${d.open}</div>
            High: <div style="color:${colorAssign(d, 'h_signal')}">${d.high}</div>
            Low: <div style="color:${colorAssign(d, 'l_signal')}">${d.low}</div>
            Close: <div style="color:${colorAssign(d, 'c_signal')}">${d.close}</div>
            `
            )
                .style('position', 'absolute')
                .style('left', `${e.x+30}px`)
                .style('top', `${e.y}px`);
        }

        let mouseleave = function(d) {
            tooltip.style('opacity', 0)
            d3.selectAll('candle')
                .style('opacity', 1);
            d3.select(this)
                .style('stroke', 'none')
                .style('opacity', 1);
        }

        svg.selectAll('candle-line')
            .data(df).enter()
            .append('line')
            .attr('x1', function (d){return x(d['id'])})
            .attr('x2', function (d){return x(d['id'])})
            .attr('y1', function (d){return y(d['low'])})
            .attr('y2', function (d){return y(d['high'])})
            .attr('stroke', function (d){return d['open'] > d['close'] ? red:green})
            .attr('stroke-width', 2)
            .attr('class', 'candle-line')
            .attr(
                'transform',
                `translate(${x.bandwidth()/2},0)`
            )
        svg.selectAll('candle')
            .data(df).enter()
            .append('rect')
            .attr('x', function (d){return x(d['id'])})
            .attr('y', function (d){
                return d['open'] < d['close'] ? y(d['close']) : y(d['open']);
            })
            .attr('width', x.bandwidth())
            .attr('height', function (d) {
                return Math.abs(y(d['open']) - y(d['close']));
            })
            .attr('fill', function (d) {
                return d['open'] > d['close'] ? red:green
            })
            .on('mouseover', mouseover)
            .on('mousemove', mousemove)
            .on('mouseleave', mouseleave);
    }
    // endregion

    // region
    // endregion

    return (
    <div id='chart-page'>
      <div id="topbar">
          <img src={require('./logo.png')} id='topbar-logo'/>
          <select
              className="nav-item"
              id="market-selector"
              value={selectedMarket}
              onChange={handleMarketChange}
          >
              {markets.map(
                  (v, i) =>
                      <option key={i} value={v}>{v}</option>
              )}
          </select>
          <select
              className="nav-item"
              id="timeframes-selector"
              value={selectedTime}
              onChange={handleTimeChange}
          >
              {timeframes.map(
                  (v, i) =>
                      <option key={i} value={v}>{v}</option>
              )}
          </select>
          <select className="nav-item" id="chart-selector">
              {charttypes.map(
                  (v, i) =>
                      <option key={i} value={v}>{v}</option>
              )}
          </select>
          <select className="nav-item" id="indicator-selector">
              {indicators.map(
                  (v, i) =>
                      <option key={i} value={v}>{v}</option>
              )}
          </select>
          <input type="date" name="start" className="nav-item" id="startdate"/>
          <input type="date" name="end" className="nav-item" id="enddate"/>
          <button className='user-item' id='forumBtn'>Go to forum</button>
          <button className='user-item' id='subscribeBtn'>Manage Subscription</button>
          <button className='user-item' id='accBtn'>Account Information</button>
          <button className='user-item' id='manageAccBtn'>Manage Account</button>
      </div>
      <div id="chart-dashboard">
        <div id="chart"></div>
        <div id="statistics"></div>
      </div>
    </div>
    );
}

export default App;
