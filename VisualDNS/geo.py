import geoip2.database

reader = geoip2.database.Reader('GeoLite2-City.mmdb')


def ip_with_geo_info(ip):
	response = reader.city(ip)
	return (ip, (
		# response.country.names['zh-CN'],
		-response.location.latitude,
		response.location.longitude
	))
