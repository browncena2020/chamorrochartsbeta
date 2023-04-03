import yfinance as yf
from datetime import datetime, timedelta
from flask import Flask
from flask_cors import CORS
import asyncio
import pandas as pd

app = Flask(__name__)
cors = CORS(app)

def format_df(df):
    df['osignal'] = df['Open'] - df['Open'].shift(1)
    df['osignal'] = df['osignal'].apply(lambda x: 1 if x > 0 else -1)
    df['hsignal'] = df['High'] - df['High'].shift(1)
    df['hsignal'] = df['hsignal'].apply(lambda x: 1 if x > 0 else -1)
    df['lsignal'] = df['Low'] - df['Low'].shift(1)
    df['lsignal'] = df['lsignal'].apply(lambda x: 1 if x > 0 else -1)
    df['csignal'] = df['Close'] - df['Close'].shift(1)
    df['csignal'] = df['csignal'].apply(lambda x: 1 if x > 0 else -1)
    return df


async def fetch_chart(market, interval, end, json):
    limited = ['30m','15m','5m']
    if interval not in limited and interval != '1m':
        start = end - timedelta(days=364)
        if interval == '1h':
            prices = yf.download(market, start=start, end=end, interval=interval).reset_index().reset_index()
            prices.rename(columns = {'index':'Date', 'level_0':'index'}, inplace = True)
        else:
            prices = yf.download(market, start=start, end=end, interval=interval).reset_index().reset_index()
    elif interval in limited:
        start = end - timedelta(days=59)
        prices = yf.download(market, start=start, end=end, interval=interval).reset_index().reset_index()
        prices.rename(columns = {'Datetime':'Date'}, inplace=True)
    elif interval == '1m':
        start = end - timedelta(days=6)
        prices = yf.download(market, start=start, end=end, interval=interval).reset_index().reset_index()
        prices.rename(columns = {'Datetime':'Date'}, inplace=True)
    data = format_df(prices)
    return data.to_json()

@app.route("/chart/<market>/<interval>")
def get_chart_async(market, interval):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    end=datetime.now()
    json=True
    try:
        result = loop.run_until_complete(fetch_chart(market, interval, end, json))
        return result
    finally:
        loop.close()


@app.route('/watchlist/<markets>')
def watchlist(markets, interval='1wk',end=datetime.now(), json=False):
    start = end - timedelta(days=364)
    df = pd.DataFrame()
    for i in markets:
        ##print(f'appending {i}')
        chart = get_chart(f"{i}=X", end=end, interval=interval).reset_index()
        df = df.append({
            'market': i,
            'values': chart['Close'][0]
        }, ignore_index=True)
    return df


@app.route("/script/<userscript>")
def evalscript(userscript):
    result = eval(userscript)
    return result


if __name__ == "__main__":
    app.run(debug=True,port=5069)
