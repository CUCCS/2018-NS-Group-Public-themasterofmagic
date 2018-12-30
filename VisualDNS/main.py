import os
from flask import request, send_file
from flask_api import FlaskAPI
from query import query
from geo import add_geo_info

app = FlaskAPI(__name__)


@app.route('/api/query')
def api_query():
	qname = request.args.get('domain', '')
	ns = request.args.get('ns', '')
	query_rv = query(qname, ns)
	add_geo_info(query_rv)
	return query_rv


@app.route('/<path:path>')
def index(path):
	path = 'static/{}'.format(path)
	return send_file(path) if os.path.exists(path) else ''


@app.route('/')
def _():
	return send_file('static/index.html')


if __name__ == '__main__':
	app.run(host='0.0.0.0')
