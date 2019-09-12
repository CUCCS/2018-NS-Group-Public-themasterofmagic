import ipaddress


def is_ip_valid(ip: str):
	try:
		ipaddress.ip_address(ip)
		rv = True
	except ValueError:
		rv = False
	return rv
