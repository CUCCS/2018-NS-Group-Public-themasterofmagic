d3.selection.prototype.bringElementAsTopLayer = function() {
	 return this.each(function(){
			 this.parentNode.appendChild(this);
	 });
};

d3.selection.prototype.pushElementAsBackLayer = function() {
	return this.each(function() {
			let firstChild = this.parentNode.firstChild;
			if (firstChild) {
					this.parentNode.insertBefore(this, firstChild);
			}
	});
};

let Visual = {
	constant: {
		svgWidth: 1950 / 2,
		svgHeight: 910 / 2,
		logicR: 25,
		logicStep: 60,
		physicalR: 10,
		arrowHeadHeight: 5,
		blinkDuration: 100,
		fadeDuration: 1000,
		moveDuration: 1500,
		colorA: "#4C4",
		colorBlink1: "#FF0",
		colorBlink2: "#880",
		colorCNAME: "#66F",
		colorError: "#C44",
		colorOk: "#66F",
		imgWidth: 1950,
		imgHeight: 910,
		imgPadding: {T: 50, B: 35, L: 20, R: 20}
	},
	moveEase: d3.easeExp,
	listNodeDatum: [],
	listPathDatum: [],
	intLvCount: 0,
	intMaxLv: null,
	intMinLv: null,
	dictLvToCount: {},
	dictLvToChosenData: {},
	svg: null,
	node: null,
	path: null,
	rect: null,
	toolTip: null,
	toolTipTimer: null,
	logic: 1,
	animationLocks: {
		fade: {},
		blink: {}
	},
	animation: {
		blink: (circle, duration) => {
			let locks = Visual.animationLocks.blink;
			circle.each((d) => {
				let id = d.id;
				locks[id] = {};
				function repeat() {
					d3.select(locks[id])
						.transition()
						.duration(duration)
						.tween("attr:fill", () => () => circle.attr("fill", Visual.constant.colorBlink1))
						.transition()
						.tween("attr:fill", () => () => circle.attr("fill", Visual.constant.colorBlink2))
						.on("end", repeat)
					;
				}
				repeat();
			});
		},
		stopBlink: (circle, strFinalRgb) => {
			circle.each((d) => {
				d3.select(Visual.animationLocks.blink[d.id])
					.transition()
				;
				Visual.animationLocks.blink[d.id] = null;
				if(typeof(strFinalRgb) !== "undefined"){
					circle.transition().duration(0).attr("fill", strFinalRgb);
				}
			});
		},
		move: (circle, duration) => {
			let locks = {};
			circle.each((d, i) => {
				let c = d3.select(circle["_groups"][0][i]);
				
				/* 坐标插值 */
				let transformA = c.attr("transform");
				Visual.setTargetXY(d);
				let transformB = `translate(${d.targetX}, ${d.targetY})`;
				let transformInterpolateString = d3.interpolateString(transformA, transformB);
				
				/* 半径插值 */
				let rA = c.attr("r");
				let rB = Visual.logic ? Visual.constant.logicR : Visual.constant.physicalR;
				let rInterpolateNumber = d3.interpolateNumber(rA, rB);
				
				let id = d.id;
				locks[id] = {};
				d3.select(locks[id])
					.transition()
					.duration(duration)
					.ease(Visual.moveEase)
					.tween("attr:transform", () => (t) => c.attr("transform", transformInterpolateString(t)))
					.tween("attr:r", () => (t) => c.attr("r", rInterpolateNumber(t)))
				;
			});
		},
		fadeIn: (element, duration) => Visual.animation.fade(element, duration, 1),
		fadeOut: (element, duration) => Visual.animation.fade(element, duration, 0),
		fade: (element, duration, targetOpacity) => {
			let locks = Visual.animationLocks.fade;
			element.each((d) => {
				let id = d.id;
				let inInterpolateNumber = d3.interpolateNumber(element.filter((_d) => _d.id === id).attr("opacity"), targetOpacity);
				locks[id] = {};
				d3.select(locks[id])
					.transition()
					.duration(duration)
					.ease(d3.easeSin)
					.tween("attr:opacity", () => (t) => element.attr("opacity", inInterpolateNumber(t)))
				;
			})
		}
	},
	init: (strSelector) => {
		let svgWidth = Visual.constant.svgWidth, svgHeight = Visual.constant.svgHeight;
		let mainDiv = d3.select(strSelector);
		let svg = Visual.svg = mainDiv
			.append("svg")
			.attr("width", svgWidth)
			.attr("height", svgHeight)
		;
		const defs = svg.append('defs');
		defs.append('marker')
			.attr('id', 'end-arrow')
			.attr('viewBox', '0 -5 10 10')
			.attr('refX', 6)
			.attr('markerWidth', 10)
			.attr('markerHeight', Visual.constant.logicStep/3)
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
			.attr("xlink:href", "world_map.jpg")
			.attr('width', svgWidth)
			.attr('height', svgHeight);
		Visual.rect = svg.append('rect')
			.attr('fill', 'url(#bg)')
			.attr('width', svgWidth)
			.attr('height', svgHeight)
			.attr("opacity", 0)
		;
		
		/* 计算0, 0经纬度的svg坐标 */
		let imgWidth = Visual.constant.imgWidth;
		let imgHeight = Visual.constant.imgHeight;
		let imgPadding = Visual.constant.imgPadding;
		let gX = ((imgWidth - imgPadding['L'] - imgPadding['R'])/36*18+imgPadding['L'])/imgWidth*svgWidth;
		let gY = ((imgHeight - imgPadding['T'] - imgPadding['B'])/15*9+imgPadding['T'])/imgHeight*svgHeight;
		let g = svg.append("g")
			.attr("transform", "translate(" + gX + "," + gY + ")")
		;
		Visual.node = g.append("g").selectAll("circle");
		Visual.path = g.append("g").selectAll("path");
		
    Visual.toolTip = d3.tip()
      .attr("class", "d3-tip")
      .offset([-8, 0])
      .html((d) => {
      	let rv = "";
      	if(typeof(d.domain) !== "undefined"){
      		rv += "<p>" + "域名:" + d.domain + "</p>";
				}
      	if(typeof(d.ip) !== "undefined"){
      		rv += "<p>" + "IP:" + d.ip + "</p>";
				}
      	if(typeof(d.cname) !== "undefined"){
      		rv += "<p>" + "别名:" + d.cname + "</p>";
				}
				rv += "<p>" + "经度:" + d.longitude + "</p>";
      	rv += "<p>" + "纬度:" + d.latitude + "</p>";
				return rv;
      })
		;
    svg.call(Visual.toolTip);
    Visual.clear();
	},
	clear: () => {
		Visual.listNodeDatum = [];
		Visual.listPathDatum = [];
		Visual.intLvCount = 0;
		Visual.intMaxLv = Visual.intMinLv = null;
		Visual.dictLvToCount = {};
		Visual.dictLvToChosenData = {};
		Visual.update();
		
	},
	plus: (d) => {
		let intLv = d.intLv;
		if(intLv > 0 && typeof(Visual.dictLvToChosenData[intLv-1]) === "undefined"){
			console.error("未选择第"+(intLv-1)+"层节点时不可添加第"+intLv+"层节点");
			return;
		}
		d.chosen = typeof(d.end) === "undefined" ? 0 : 1;
		
		d.id = Visual.listNodeDatum.length;
		/* 如果当前层次尚未出现过 */
		if(typeof(Visual.dictLvToCount[intLv]) === "undefined"){
			if(Visual.intLvCount === 0){
				Visual.intMaxLv = Visual.intMinLv = intLv;
			}
			Visual.intLvCount += 1;
			Visual.dictLvToCount[intLv] = 1;
			if(Visual.intMaxLv < intLv){
				Visual.intMaxLv = intLv;
			}
			if(Visual.intMinLv > intLv){
				Visual.intMinLv = intLv;
			}
			if(d.intLv > 0) {
				Visual.getElementById(Visual.dictLvToChosenData[d.intLv - 1].id)
					.call(Visual.animation.stopBlink, Visual.constant.colorOk)
				;
			}
		}
		/* 如果当前层次已经出现过 */
		else{
			Visual.dictLvToCount[intLv] += 1;
		}
		
		let temp = Visual.dictLvToCount[intLv];
		d.posX = (temp%2 ? 1 : -1) * Math.floor(temp/2);
		
		Visual.listNodeDatum.push(d);
		Visual.listNodeDatum.forEach((d) => {
			d.posY = d.intLv - (Visual.intMaxLv + Visual.intMinLv)/2;
		});
		
		if(intLv > 0){
			Visual.listPathDatum.push({
				id: -Visual.listPathDatum.length-1,
				source: Visual.dictLvToChosenData[intLv-1],
				target: d
			});
		}
		
		/* 进行绘制 */
		Visual.update();
	},
	choose: (d) => {
		Visual.dictLvToChosenData[d.intLv] = d;
		Visual.node.filter((_d) => _d.intLv === d.intLv)
			.attr("fill", "#888")
		;
		Visual.getElementById(d.id)
			.call(Visual.animation.blink, Visual.constant.blinkDuration)
			.bringElementAsTopLayer()
		;
		d.chosen = 1;
	},
	update: () => {
		/* circle部分 */
		let node = Visual.node;
		node = node.data(Visual.listNodeDatum);
		node.exit().remove();
		node = node.enter().append("circle")
			.pushElementAsBackLayer()
			.attr("r", Visual.logic ? Visual.constant.logicR : Visual.constant.physicalR)
			.attr("fill", (d) => typeof(d.end) === "undefined" ? "#888" : Visual.constant["color"+d.end])
			.attr("data-content", "Wow!")
			.attr("transform", (d) => d.intLv === 0 ? `translate(0,0)` : Visual.getElementById(Visual.dictLvToChosenData[d.intLv-1].id).attr("transform"))
			.attr("opacity", 0)
      .on('mouseover', (d, n, a) => {
      	window.clearInterval(Visual.toolTipTimer);
      	let e = d3.event, c = d3.select(a[n]);
      	let strCurrentTransform = "";
      	Visual.toolTipTimer = setInterval(() => {
      		if (strCurrentTransform !== c.attr("transform")) {
      			strCurrentTransform = c.attr("transform");
						d3.event = e;
						Visual.toolTip.show(d, n, a);
					}
				}, 0);
			})
      .on('mouseout', (d, n, a) => {
      	Visual.toolTip.hide(d, n, a);
      	window.clearInterval(Visual.toolTipTimer);
			})
			.call(Visual.animation.fadeIn, Visual.constant.fadeDuration)
			.merge(node)
			.call(Visual.animation.move, Visual.constant.moveDuration)
		;
		node
			.filter((d) => !d.chosen)
			.call(Visual.logic ? Visual.animation.fadeIn : Visual.animation.fadeOut, Visual.constant.fadeDuration)
		;
		node
			.filter((d) => d.chosen)
			.call(Visual.animation.fadeIn, Visual.constant.fadeDuration)
		;
		
		Visual.node = node;
		/* path部分 */
		let path = Visual.path;
		path = path.data(Visual.listPathDatum);
		path.exit().remove();
		path = path.enter().append("svg:path")
			.attr("d", (d) => {
				let source = Visual.extractTransform(Visual.getElementById(d.source.id));
				let target = Visual.extractTransform(Visual.getElementById(d.target.id));
				return `M${source}L${target}`
			})
			.attr("class", "link")
			.style('marker-end', 'url(#end-arrow)')
			.call(Visual.animation.fadeIn, Visual.constant.fadeDuration)
			.merge(path)
		;
		path
			.transition()
			.duration(Visual.constant.moveDuration)
			.ease(Visual.moveEase)
			.attr("d", (d) =>{
				Visual.setTargetXY(d.source);
				Visual.setTargetXY(d.target);
				let sourceX = d.source.targetX;
				let sourceY = d.source.targetY;
				let targetX = d.target.targetX;
				let targetY = d.target.targetY;
				let deltaX = targetX - sourceX;
				let deltaY = targetY - sourceY;
				let dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
				let normX = deltaX / dist;
				let normY = deltaY / dist;
				let targetR = Visual.logic ? Visual.constant.logicR : Visual.constant.physicalR;
				targetX -= targetR*normX;
				targetY -= targetR*normY;
				return `M${sourceX},${sourceY}L${targetX},${targetY}`
			})
		;
		path
			.filter((d) => !d.target.chosen)
			.call(Visual.logic ? Visual.animation.fadeIn : Visual.animation.fadeOut, Visual.constant.fadeDuration)
		;
		path
			.filter((d) => d.target.chosen)
			.call(Visual.animation.fadeIn, Visual.constant.fadeDuration)
		;
		Visual.path = path;
	},
	extractTransform: (c) => c.attr("transform").slice(9).slice(1, -1),
	getElementById: (id) => d3.select((id >= 0 ? Visual.node : Visual.path)._groups[0][id]),
	fail: () => {
		Visual.getElementById(Visual.dictLvToChosenData[Visual.intMaxLv].id)
			.call(Visual.animation.stopBlink, Visual.constant.colorError)
		;
	},
	turnLogic: () => {
		Visual.logic = 1;
		Visual.rect.transition()
			.duration(Visual.constant.moveDuration)
			.attr("opacity", 0);
		Visual.update();
	},
	turnPhysical: () => {
		Visual.logic = 0;
		Visual.rect.transition()
			.duration(Visual.constant.moveDuration)
			.attr("opacity", 1);
		Visual.update();
	},
	geoToSvgPos: (longitude, latitude) => {
		let x = longitude;
		let y = latitude;
		let imgWidth = Visual.constant.imgWidth;
		let imgHeight = Visual.constant.imgHeight;
		let imgPadding = Visual.constant.imgPadding;
		
		x = ((imgWidth - imgPadding['L'] - imgPadding['R'])/360*x)/imgWidth*Visual.constant.svgWidth;
		y = ((imgHeight - imgPadding['T'] - imgPadding['B'])/150*y)/imgHeight*Visual.constant.svgHeight;

		return [x, y];
	},
	setTargetXY: (d) => {
		if(Visual.logic){
			d.targetX = d.posX * Visual.constant.logicStep;
			d.targetY = d.posY * Visual.constant.logicStep - Visual.constant.svgHeight/4;
		}
		else{
			let targetXY = Visual.geoToSvgPos(d.longitude, d.latitude);
			d.targetX = targetXY[0];
			d.targetY = targetXY[1];
		}
	}
};
