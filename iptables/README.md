# 逆向分析/点评 - iptables规则题
## 1.场景描述
- 局域网拓扑结构如下:

		+----------------------+          +-------------------------+       +----------------------+     
		|     host-1           |          |   host-2                |       |     host-3           |  
		|     172.16.18.11     |          |   eth1: 172.16.18.1     |       |     172.16.18.12     |  
		|                      |          |   eth0: 192.168.1.123   |       |                      |  
		+-------------+--------+          +----------+--------------+       +-------------+--------+  
		              |                              |                                    |
		              |                              |                                    |
		     +--------+------------------------------+--+                                 |
		     |                交换机                     |---------------------------------+
		     +-----------------+------------------------+
		                       |
		                       |
		                 +-----+-----------+
		                 |   eth0          |   `
		                 |   192.168.1.1   |
		              +--+-----------------+---------+
		              |                              |
		              |        host-gw / dns-svr     |
		              |                              |
		              +------------------+----------++
		                                 |  eth1    |
		                                 +----------+
- 补充文字说明如下：
	- host-gw 指的是该局域网的网关，已经配置为 NAT 方式，局域网内的主机 host-2 可以正常无障碍访问互联网；
	- dns-svr 指的是该局域网中的 DNS 解析服务器，可以正常提供域名解析服务；
	- 交换机没有设置 VLAN，所有端口正常工作；
	- host-2上配置了 iptables规则；
	- host-1上配置了默认网关指向 IP 地址：172.16.18.1，域名解析服务器配置为 IP：192.168.1.1
	- host-3上配置了默认网关指向 IP 地址：172.16.18.1，域名解析服务器配置为 IP：192.168.1.1
- host-2 上的 iptables 配置脚本如下：
	```bash
	#!/bin/bash
	
	IPT="/sbin/iptables"
	
	$IPT --flush
	$IPT --delete-chain
	
	$IPT -P INPUT DROP
	$IPT -P FORWARD DROP
	$IPT -P OUTPUT ACCEPT
	
	$IPT -N forward_demo
	$IPT -N ICMP_demo
	
	$IPT -A INPUT -i lo -j ACCEPT
	$IPT -A OUTPUT -o lo -j ACCEPT
	
	$IPT -A INPUT -p tcp ! --syn -m state --state NEW -s 0.0.0.0/0 -j DROP
	
	$IPT -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
	
	$IPT -A INPUT -p ICMP -j ICMP_demo
	
	$IPT -A ICMP_demo -p ICMP -i eth0 -j ACCEPT
	$IPT -A ICMP_demo -j RETURN
	
	$IPT -A FORWARD -j forward_demo
	
	$IPT -A forward_demo -j LOG --log-prefix FORWARD_DEMO
	$IPT -A forward_demo -p tcp --dport 80 -m string --algo bm --string 'baidu' -j DROP
	$IPT -A forward_demo -p tcp -s 172.16.18.11 -j ACCEPT
	$IPT -A forward_demo -p tcp -d 172.16.18.11 -j ACCEPT
	$IPT -A forward_demo -p udp -s 172.16.18.11 --dport 53 -j ACCEPT
	$IPT -A forward_demo -p udp -s 172.16.18.1  --dport 53 -j ACCEPT
	$IPT -A forward_demo -p udp -s 192.168.1.1  --sport 53 -j ACCEPT
	$IPT -A forward_demo -p tcp -s 172.16.18.1 -j ACCEPT
	$IPT -A forward_demo -s 172.16.18.1 -j RETURN
	
	$IPT -t nat -A POSTROUTING -s 172.16.18.1/24 -o eth0 -j MASQUERADE
	```

## 2.任务要求
- 请对上述脚本逐行添加代码注释

### 回答以下问题
- host-1可以ping通ip: 172.16.18.1吗？
- host-1可以ping通ip: 192.168.1.1吗？
- host-1可以ping通域名: www.baidu.com吗？
- host-1可以访问： http://www.baidu.com 吗？
- host-1可以访问：http://61.135.169.121 吗？
- host-3可以ping通ip: 172.16.18.1吗？
- host-3可以ping通ip: 192.168.1.1吗？
- host-3可以访问互联网吗？

## 3. 解答
- 请对上述脚本逐行添加代码注释
	```bash
	#!/bin/bash
	
	IPT="/sbin/iptables"
	
	# 重置iptables
	$IPT --flush
	$IPT --delete-chain
	
	# 定义三条默认链的默认规则
	$IPT -P INPUT DROP
	$IPT -P FORWARD DROP
	$IPT -P OUTPUT ACCEPT
	
	# 新建两条自定义的链
	$IPT -N forward_demo
	$IPT -N ICMP_demo
	
	# 接受发往或来自本地回环地址的数据包
	$IPT -A INPUT -i lo -j ACCEPT
	$IPT -A OUTPUT -o lo -j ACCEPT
	
	# ! --syn : Flags非SYN
	# -m state --state NEW : 包状态非NEW(即用于建立连接的第一个包)
	# -s 0.0.0.0/0: 任意来源
	# 总结: 拒绝任何企图以非SYN包尝试建立连接的包(比如在建立之前发一个ACK包来探测本机状态之类的网络扫描发的包)
	$IPT -A INPUT -p tcp ! --syn -m state --state NEW -s 0.0.0.0/0 -j DROP
	
	# 接受所有在连接建立之后正常传入的数据包
	$IPT -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
	
	# 将传入的ICMP包交由ICMP_demo链处理
	$IPT -A INPUT -p ICMP -j ICMP_demo
	
	# 接受发往eth0网卡的ICMP包
	# 其他包则交由引用链处理
	$IPT -A ICMP_demo -p ICMP -i eth0 -j ACCEPT
	$IPT -A ICMP_demo -j RETURN
	
	# 将准备转发的包交由forward_demo链处理
	$IPT -A FORWARD -j forward_demo
	
	# 先记录日志
	$IPT -A forward_demo -j LOG --log-prefix FORWARD_DEMO
	# -m string --algo --bm --string 'baidu'
	# 使用bm算法判断一个数据包中是否包含字符串'baidu'
	# 总结: DROP掉目标端口为80的包含'baidu'字符串的TCP包
	$IPT -A forward_demo -p tcp --dport 80 -m string --algo bm --string 'baidu' -j DROP
	# 接受来自或发往172.16.18.11的TCP包
	$IPT -A forward_demo -p tcp -s 172.16.18.11 -j ACCEPT
	$IPT -A forward_demo -p tcp -d 172.16.18.11 -j ACCEPT
	# 接受来自172.16.18.11, 172.16.18.1的目标端口为53的UDP包
	# (意在接受并转发这两个ip的DNS query)
	$IPT -A forward_demo -p udp -s 172.16.18.11 --dport 53 -j ACCEPT
	$IPT -A forward_demo -p udp -s 172.16.18.1  --dport 53 -j ACCEPT
	# 接受来自182.168.1.1的源端口为53的UDP包
	# (意在接受并转发DNS服务器的DNS response)
	$IPT -A forward_demo -p udp -s 192.168.1.1  --sport 53 -j ACCEPT
	# 接受来自172.16.18.1的TCP包
	$IPT -A forward_demo -p tcp -s 172.16.18.1 -j ACCEPT
	# 将来自172.16.18.1的包交由引用链处理
	$IPT -A forward_demo -s 172.16.18.1 -j RETURN
	
	# 将172.16.18.1/24这个子网中的包进行NAT转发
	# 这是一个网关的基本操作
	$IPT -t nat -A POSTROUTING -s 172.16.18.1/24 -o eth0 -j MASQUERADE
	```

### 回答以下问题
- host-1可以ping通ip: 172.16.18.1吗？
	- **不可以**
		- 该ip指向的是host-2上与host-1在一个子网的eth1网卡, 所以对于host-2来说属于传入的数据包, 适用于INPUT链
		- INPUT链引用的ICMP_demo链将这个包交回给INPUT处理, 而INPUT链的默认策略是DROP
		- 故由host-1发往172.16.18.1的ICMP包最后会被DROP
- host-1可以ping通ip: 192.168.1.1吗？
	- **不可以**
		- 该ip指向的是host-2上与host-1不在一个子网的eth0网卡, 所以对于host-2来说属于待转发的数据包, 适用于FORWARD链
		- FORWARD链引用的forward_demo链将这个包交回给FORWARD处理, 而FORWARD链的默认策略是DROP
		- 故由host-1发往192.168.1.1的ICMP包最后会被DROP
- host-1可以ping通域名: www.baidu.com吗？
	- **不可以**
		- 首先在ping这个域名之前会解析该域名的ip地址. 来自host-1的DNS query对于host-2来说属于待转发的数据包, 适用于FORWARD链
		- 而FORWARD链引用的forward_demo链中规定了接受来自host-1的DNS query, 同时也接受来自gateway的DNS response. 所以这两种包是可以进行正常转发的, host-1可以获得目标域名的ip地址
		- 获得目标域名的ip地址后, host-1将对该域名发送ICMP包. 而基于同上一题一样的道理, host-2会DROP该包
		- 故由host-1发往目标域名的ICMP包会被DROP
- host-1可以访问：http://www.baidu.com 吗？
	- **不可以**
		- 首先基于同上一题一样的道理, 域名解析这步是没问题的
		- 获得目标域名的ip地址后, host-1将对该域名发送TCP包. 而host-2的FORWARD链规定了, 包含指定关键字的目标端口为80的TCP包都将被DROP
		- 故host-1发往目标域名的TCP包会被DROP
- host-1可以访问：http://61.135.169.121 吗？
	- **可以**
		- 首先由于不涉及域名, host-1可以直接往目标ip发送TCP包
		- 根据forward_demo链, host-2首先会检查该包是否包含指定关键字. 如果不包含, 那么对于来源于host-1的TCP包, 直接接受. 所以来源于host-1的TCP包可以到达目标ip
		- 而目标ip回复的数据包中虽然也包含目标关键字, 但是其目标端口不是80, 所以没有马上被DROP掉, 而后由于其是发往host-1的TCP包, 所以被接受了, 进而被转发至host-1 
		- 故host-1可以访问目标ip
- host-3可以ping通ip: 172.16.18.1吗？
	- **不可以**
		- 理由同host-1
- host-3可以ping通ip: 192.168.1.1吗？
	- **不可以**
		- 理由同host-1
- host-3可以访问互联网吗？
	- **不可以**
		- 来源于host-3的待转发的包没有匹配到forward_demo链上的任何规则, 最后根据FORWARD链的默认策略, 来源于host-3的待转发的包将被DROP
		- 故host-3不可以访问互联网
