import geoip2.database

reader = geoip2.database.Reader('GeoLite2-City.mmdb')


def get_ip_geo_info(ip):
	response = reader.city(ip)
	rv = (
		# response.country.names['zh-CN'],
		-response.location.latitude,
		response.location.longitude
	)
	return rv


def add_geo_info(query_rv: dict):
	if query_rv['status'] != 'FAIL':
		ip_list = list(query_rv['domain_to_ip'].values())
		ip_to_geo = dict((ip, get_ip_geo_info(ip)) for ip in ip_list)
		query_rv['ip_to_geo'] = ip_to_geo
