/* 定义页面元素的相关响应动作 */
$('#queryBtn').attr('onclick', 'query()');
$('#logicViewBtn').attr('onclick', 'logic = true');
$('#physicalViewBtn').attr('onclick', 'logic = false');

/* 常参数定义 */
const svgWidth = 1950 / 2;
const svgHeight = 910 / 2;

const imgWidth = 1950;
const imgHeight = 910;
const imgPadding = {'T': 50, 'B': 35, 'L': 20, 'R': 20};

const logicNodeRadius = 60, physicalNodeRadius = 5;
const nodeDistance = 2.5 * logicNodeRadius;
const timerInterval = 10;
const changeRate = 0.075;

/* 读取根服务器的所有经纬度 */
let rootServersCoords = null;
$.getJSON('/root_servers.json', function (coords) {
	rootServersCoords = coords;
});

let logic = true;
let querying = false;
let timer = null;
let rectOpacity = 0;

/* 初始化svg元素 */
const svg = d3.select('body')
	.select('svg')
	.attr('width', svgWidth)
	.attr('height', svgHeight);
const defs = svg.append('defs');
defs.append('marker')
	.attr('id', 'end-arrow')
	.attr('viewBox', '0 -5 10 10')
	.attr('refX', 6)
	.attr('markerWidth', 3)
	.attr('markerHeight', 3)
	.attr('orient', 'auto')
	.append('path')
	.attr('d', 'M0,-5L10,0L0,5')
	.attr('fill', '#000');
defs
	.append("pattern")
	.attr("id", "bg")
	.attr('width', svgWidth)
	.attr('height', svgHeight)
	.attr('patternUnits', 'userSpaceOnUse')
	.append("image")
	.attr("xlink:href", "world_map_small.jpg")
	.attr('width', svgWidth)
	.attr('height', svgHeight);
const rect = svg.append('rect')
	.attr('fill', 'url(#bg)')
	.attr('width', svgWidth)
	.attr('height', svgHeight)
	.attr('opacity', rectOpacity);

function simulate(queryRv) {
	/* 构造颜色生成器 */
	let h1 = Math.random() * 360, h2 = (h1 + 60) % 360;
	let s1 = 1, s2 = 1;
	let l1 = 0.5, l2 = 0.5;
	let sourceColor = d3.hsl(h1, s1, l1), destinationColor = d3.hsl(h2, s2, l2);
	let computeColor = d3.interpolateHslLong(sourceColor, destinationColor);
	/* 构造节点数据 */
	let linear = d3.scaleLinear().domain([0, queryRv.path.length - 1]).range([0, 1]);
	let nodeDatum = queryRv.path.map(function (domain, i) {
		let geo = queryRv['ip_to_geo'][queryRv['domain_to_ip'][domain]];
		let rv = {
			value: domain,
			color: computeColor(linear(i)),
			logicX: 200 + nodeDistance * i,
			logicY: 100,
			latitude: geo[0],
			longitude: geo[1],
			radius: getTargetRadius(),
			opacity: getTargetOpacity()
		};
		let pos = getTargetPos(rv);
		rv.x = pos[0];
		rv.y = pos[1];
		return rv;
	});
	
	/* 构造边数据 */
	let linkDatum = Array();
	for (let i = 0; i < nodeDatum.length - 1; ++i) {
		linkDatum.push({source: nodeDatum[i], target: nodeDatum[i + 1]});
	}
	
	/* 重置节点元素与边元素 */
	svg.selectAll('g').remove();
	let allPath = svg.append('g').selectAll('path'); // 要先生成边, 否则它会覆盖在节点之上
	let allNode = svg.append('g').selectAll('g');
	
	/* 绑定节点数据 */
	allNode = allNode.data(nodeDatum, (d) => d.id);
	allNode.exit().remove();
	const g = allNode.enter().append('g');
	const allCircle = g
		.append('circle')
		.attr('class', 'node')
		.attr('r', (d) => d.radius)
		.style('fill', (d) => d.color)
	;
	const allText = g.append('text')
		.attr('x', 0)
		.attr('y', 4)
		.attr('class', 'id')
		.attr('opacity', 1)
		.text((d) => d.value)
	;
	allNode = allNode.merge(g);
	
	/* 绑定边数据 */
	allPath = allPath.data(linkDatum);
	allPath.exit().remove();
	allPath = allPath.enter().append('svg:path')
		.attr('class', 'link')
		.style('marker-end', 'url(#end-arrow)')
		.merge(allPath);
	
	/* 重置计时器 */
	clearInterval(timer);
	timer = setInterval(tick, timerInterval);
	
	function tick() {
		/* 更新数据 */
		let targetRadius = getTargetRadius();
		let targetOpacity = getTargetOpacity();
		nodeDatum.forEach(function (data) {
			/* 更新坐标 */
			let targetPos = getTargetPos(data);
			let targetX = targetPos[0], targetY = targetPos[1];
			data.x += changeRate * (targetX - data.x);
			data.y += changeRate * (targetY - data.y);
			/* 更新半径 */
			data.radius += changeRate * (targetRadius - data.radius);
			/* 更新文字透明度 */
			data.opacity += changeRate * (targetOpacity - data.opacity);
		});
		rectOpacity += changeRate * (1 - targetOpacity - rectOpacity);
		
		/* 应用数据 */
		allNode.attr('transform', (d) => "translate(${d.x},${d.y})");
		allPath.attr('d', (d) => {
			const deltaX = d.target.x - d.source.x;
			const deltaY = d.target.y - d.source.y;
			const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY) + 1;
			const normX = deltaX / dist;
			const normY = deltaY / dist;
			const sourcePadding = d.source.radius;
			const targetPadding = d.target.radius + 5;
			const sourceX = d.source.x + (sourcePadding * normX);
			const sourceY = d.source.y + (sourcePadding * normY);
			const targetX = d.target.x - (targetPadding * normX);
			const targetY = d.target.y - (targetPadding * normY);
			
			return `M${sourceX},${sourceY}L${targetX},${targetY}`;
		});
		allCircle.attr('r', (d) => d.radius);
		allText.attr('opacity', (d) => d.opacity);
		rect.attr('opacity', rectOpacity);
	}
}

function getTargetPos(data) {
	return logic ? [data.logicX, data.logicY] : geoToSvgPos(data.longitude, data.latitude);
}

function getTargetRadius() {
	return logic ? logicNodeRadius : physicalNodeRadius;
}

function getTargetOpacity() {
	return logic ? 1 : 0;
}

function geoToSvgPos(longitude, latitude) {
	let x = longitude;
	let y = latitude;
	
	/* geo to image */
	x = x / 360 + 0.5;
	y = (y / 180 + 0.5) * 180 / 150;
	x *= imgWidth - imgPadding['L'] - imgPadding['R'];
	y *= imgHeight - imgPadding['T'] - imgPadding['B'];
	x += imgPadding['L'];
	y += imgPadding['T'];
	
	/* image to svg */
	x *= svgWidth / imgWidth;
	y *= svgHeight / imgHeight;
	
	return [x, y];
}

function query() {
	if (!querying) {
		querying = true;
		let queryBtn = $('#queryBtn');
		let domainInput = $('#domain');
		domainInput.val(domainInput.val() || domainInput.attr('placeholder'));
		let domain = domainInput.val();
		queryBtn.attr('disabled', '');
		setHint('查询中, 请稍后...');
		$.getJSON('/api/query?domain=' + domain, function (queryRv) {
			querying = false;
			queryBtn.removeAttr('disabled');
			let status = queryRv['status'];
			if (status !== 'FAIL') {
				setHint('查询成功!域名' + domain + '拥有' + status + '记录' + queryRv['answer']);
				simulate(queryRv);
			}
			else {
				let value = queryRv['value'];
				let reason = {
					'NO_SUCH_DOMAIN': '没有这个域名!',
					'TIMEOUT': 'DNS服务器无响应, 可能是网络不好?',
					'UNKNOWN_ERROR': '未知错误!'
				}[value] || '未知错误!';
				setHint('查询失败!' + reason);
			}
		});
	}
}

function setHint(info) {
	$('#hint').text(info);
}
