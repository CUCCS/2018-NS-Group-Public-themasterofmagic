d3.selection.prototype.value = function (value) {
	let rv = null;
	this.each(function () {
		if (typeof(value) !== "undefined") {
			this.value = value;
		}
		rv = this.value;
	});
	return rv;
};

function chooseRandomItem(items) {
	return items[Math.floor(Math.random() * items.length)];
}

let DNS = {
	intNewLvInterval: 3000,
	arrDnsServers: [
		["谷歌", ["8.8.8.8", "8.8.4.4"]],
		["阿里", ["223.5.5.5", "223.6.6.6"]],
		["DNSPod", ["119.29.29.29", "182.254.116.116"]],
		["114DNS", ["114.114.114.114", "114.114.115.115"]],
		["DNS派", ["101.226.4.6", "218.30.118.6"]]
	],
	init: (strSelector) => {
		// to do: 把硬编码在html里东西去掉, 改为在DNS.init函数中动态添加
		/* 定义页面元素 */
		d3.select(strSelector);
		DNS.divAlert = d3.select("#divAlert");
		DNS.inputDnsServerIp = d3.select("#inputDnsServerIp");
		DNS.btnRandomDnsServerIp = d3.select("#btnRandomDnsServerIp");
		DNS.ddDnsServerIpList = d3.select("#ddDnsServerIpList");
		DNS.inputQname = d3.select("#inputQname");
		DNS.btnRandomQname = d3.select("#btnRandomQname");
		DNS.btnQuery = d3.select("#btnQuery");
		
		/* DNS服务器IP相关 */
		DNS.arrDnsServers.forEach((item) => {
			let strCorp = item[0], strIp1 = item[1][0], strIp2 = item[1][1];
			DNS.ddDnsServerIpList.append("a")
				.attr("class", "dropdown-item")
				.on("click", () => DNS.inputDnsServerIp.value(strIp1))
				.html(strCorp + "(首选)" + strIp1)
			;
			DNS.ddDnsServerIpList.append("a")
				.attr("class", "dropdown-item")
				.on("click", () => DNS.inputDnsServerIp.value(strIp2))
				.html(strCorp + "(备选)" + strIp2)
			;
		});
		DNS.btnRandomDnsServerIp
			.on("click", () => DNS.inputDnsServerIp.value(chooseRandomItem(chooseRandomItem(DNS.arrDnsServers)[1])))
		;
		
		/* 待查询域名相关 */
		DNS.btnRandomQname
			.on("click", () => {
				$.getJSON("/api/random_qname", (rv) => {
					DNS.inputQname.value(rv["qname"]);
				});
			});
		DNS.btnQuery
			.on("click", DNS.query)
		;
	},
	query: () => {
		/* 函数绑定 */
		let rawQuery = DNS.rawQuery,
			checkQueryRv = DNS.checkQueryRv;
		let plus = DNS.callbacks.plus,
			choose = DNS.callbacks.choose;
		
		/* 时间记录, 防止更新过快 */
		let dictLvToTime = {};
		
		/* 重置外部内容 */
		DNS.callbacks.externalReset();
		
		/* 获取参数 */
		let strQname = DNS.inputQname.value();
		let strDnsServerIp = DNS.inputDnsServerIp.value();
		
		let intLv = 0;
		
		let geo = DNS.ipToGeo(strDnsServerIp);
		if (geo === null) {
			DNS.alert.red("查询失败!" + strDnsServerIp + "不是个合法的DNS服务器ip");
			return;
		}
		let datum;
		
		let d = {
			intLv: intLv,
			ip: strDnsServerIp,
			longitude: geo[0],
			latitude: geo[1]
		};
		plus(d);
		dictLvToTime[intLv] = DNS.currentTime();
		choose(d);
		
		/* Step 1 查询根域名NS记录 */
		DNS.alert.yellow("正在等待" + strDnsServerIp + "的回应...");
		
		rawQuery(".", strDnsServerIp, "NS", (rv) => {
			DNS.alert.blue("收到" + strDnsServerIp + "的回应!");
			intLv += 1;
			if (!checkQueryRv(rv)) return;
			/* 根据返回结果构造节点数据 */
			datum = [];
			rv.answers.forEach((ans) => {
				geo = DNS.ipToGeo(chooseRandomItem(ans[1]));
				datum.push({
					intLv: intLv,
					domain: ans[0],
					ip: strDnsServerIp,
					longitude: geo[0],
					latitude: geo[1]
				});
			});
			datum.forEach((d) => {
				plus(d);
			});
			d = chooseRandomItem(datum);
			setTimeout(() => {
				dictLvToTime[intLv] = DNS.currentTime();
				choose(d);
				/* Step 2 查询顶级域名NS记录 */
				let parts = strQname.split('.');
				let strTopDomain = parts[parts.length - (parts[parts.length - 1] === "" ? 2 : 1)] + ".";
				DNS.alert.yellow("正在等待" + d.domain + "的回应...");
				rawQuery(strTopDomain, d.ip, "NS", (rv) => {
					DNS.alert.blue("收到" + d.domain + "的回应!");
					intLv += 1;
					if (!checkQueryRv(rv)) return;
					/* 根据返回结果构造节点数据 */
					datum = [];
					rv.answers.forEach((ans) => {
						geo = DNS.ipToGeo(chooseRandomItem(ans[1]));
						datum.push({
							intLv: intLv,
							domain: ans[0],
							ip: strDnsServerIp,
							longitude: geo[0],
							latitude: geo[1]
						});
					});
					datum.forEach((d) => {
						plus(d);
					});
					d = chooseRandomItem(datum);
					setTimeout(() => {
						choose(d);
						
						/* Step 3 循环查询主机名A记录 */
						function loopBody(rv) {
							intLv += 1;
							if (!checkQueryRv(rv)) return;
							
							if (rv.type === "NS") {
								DNS.alert.blue("收到" + d.domain + "的回应!");
								/* 根据返回结果构造节点数据 */
								datum = [];
								rv.answers.forEach((ans) => {
									geo = DNS.ipToGeo(chooseRandomItem(ans[1]));
									datum.push({
										intLv: intLv,
										domain: ans[0],
										ip: strDnsServerIp,
										longitude: geo[0],
										latitude: geo[1]
									});
								});
								datum.forEach((d) => {
									plus(d);
								});
								d = chooseRandomItem(datum);
								setTimeout(() => {
									choose(d);
									DNS.alert.yellow("正在等待" + d.domain + "的回应...");
									rawQuery(strQname, d.ip, "A", loopBody);
								}, dictLvToTime[intLv - 1] + DNS.intNewLvInterval - DNS.currentTime());
							}
							else {
								let answer = chooseRandomItem(rv.answers);
								let alertInfo = "查询成功!目标的" + rv.type + "记录为" + answer;
								if (rv.type === "A") {
									geo = DNS.ipToGeo(answer);
									d = {
										intLv: intLv,
										domain: strQname,
										ip: answer,
										longitude: geo[0],
										latitude: geo[1],
										end: "A"
									};
									plus(d);
									DNS.alert.green(alertInfo)
								}
								else if (rv.type === "CNAME") {
									rawQuery(answer, null, "A", (rv) => {
										geo = DNS.ipToGeo(chooseRandomItem(rv.answers));
										d = {
											intLv: intLv,
											domain: strQname,
											cname: answer,
											longitude: geo[0],
											latitude: geo[1],
											end: "CNAME"
										};
										plus(d);
										DNS.alert.blue(alertInfo)
									})
								}
							}
						}
						
						DNS.alert.yellow("正在等待" + d.domain + "的回应...");
						rawQuery(strQname, d.ip, "A", loopBody);
					}, dictLvToTime[intLv - 1] + DNS.intNewLvInterval - DNS.currentTime());
				})
			}, dictLvToTime[intLv - 1] + DNS.intNewLvInterval - DNS.currentTime());
		});
	},
	rawQuery: (strDomain, strDnsServer, strQueryType, callback) =>
		DNS.GET("/api/query", {qname: strDomain, dns_server: strDnsServer, qtype: strQueryType}, callback)
	,
	checkQueryRv: (rv) => {
		let isOk = true;
		if (rv.type === "FAIL") {
			isOk = false;
			let d = {
				"NO_SUCH_DOMAIN": "域名不存在",
				"TIMEOUT": "查询超时",
				"UNSUPPORTED_QTYPE": "查询类型不支持",
				"INVALID_DNS_SERVER_IP": "DNS服务器IP地址不合法",
				"UNKNOWN_ERROR": "未知错误"
			};
			let info = d[rv.info];
			DNS.alert.red("查询失败!" + info);
			DNS.callbacks.fail();
		}
		return isOk;
	},
	ipToGeo: (ip) => {
		let result = null;
		$.ajax({
			url: "/api/ip_to_geo?ip=" + ip,
			dataType: "json",
			async: false,
			success: function (data) {
				result = data;
			}
		});
		let rv;
		if (result["status"] === "OK") {
			rv = result["geo"];
		}
		else {
			rv = null;
		}
		return rv;
	},
	GET: $.getJSON,
	callbacks: {
		externalReset: () => {
		},
		plus: () => {
		},
		choose: () => {
		}
	},
	alert: {
		red: (content) => DNS.alert._raw(content, "danger"),
		yellow: (content) => DNS.alert._raw(content, "warning"),
		blue: (content) => DNS.alert._raw(content, "primary"),
		green: (content) => DNS.alert._raw(content, "success"),
		_raw: (content, cls) => {
			DNS.divAlert.attr("class", "alert alert-dismissible fade show alert-" + cls);
			DNS.divAlert.html(content);
		}
	},
	currentTime: () => (new Date()).getTime()
};
