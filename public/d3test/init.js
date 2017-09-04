/*global console, d3*/

const C = (funcName, a) => {
    /* eslint-disable no-console */
    if (typeof a === 'object') {
        a = Array.prototype.map.call(a, elem => elem).join(", ");
    }
    console.log(`${funcName} ${!a ? '' : `: ${a}`}`);
    /* eslint-enable no-console */
};

const ready = fn => {
    if (document.attachEvent ? document.readyState === "complete" : document.readyState !== "loading") {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
};

// var server = 'http://192.168.50.151:8080/fw/';
var picURL = "i/";
var isInit = false;
var GVP = document.querySelector('div.graph_viewport');
ready(
    function () {
        function graphInit(width, height, myjson, uuid, origOffsetX, origOffsetY, origScaleCoef, vertex1, vertex2) {
            C('graphInit', arguments);

            var graph = JSON.parse(myjson);
            var nodes = graph.nodes;
            var links = graph.links;
            var selected_node = null;
            var selected_link = null;
            var mousedown_node = null;
            var dragged = false;
            var gNode = 'div.graph_viewport';

            d3.select(gNode).select("svg").remove(); // удаляет старое svg если есть

            var svg = d3.select(gNode).append("svg")
                .attr({
                    "width": width,
                    "height": height,
                    "pointer-events": "all"
                })
                .append('svg:g')
                .call(d3.behavior.zoom().on("zoom", rescale))
                .on("dblclick.zoom", null)
                .append('svg:g');

            GVP.graphViewPort('updateParams', origOffsetX, origOffsetY, origScaleCoef); // обновляем параметры зума на панеле управления графом

            function dragendSvg() {
                C('dragendSvg', arguments);
                GVP.graphViewPort('notifyAndRedraw');
            }

            function rescale() {
                C('rescale', arguments);
                if (mousedown_node !== null) {
                    return; // если нажали на узел и перетаскиваем его, то не делать зум
                }
                var trans = d3.event.translate;
                var scale = d3.event.scale;
                // обновляем клиента
                svg.attr({
                    'transform-origin': '50% 50%',
                    "transform": "translate(" + trans + ")" + " scale(" + scale + ")"
                });
                // обновляем локально с перерасчетом

                // если зум то перерисовываем на сервере
                GVP.graphViewPort('rescaleAndUpdate', trans[0], trans[1], scale);
                if (scale !== 1) {
                    //GVP.graphViewPort( 'rescaleAndUpdate' , 0 , 0 , scale );
                    // обновляем сервер и перерисовываем
                    GVP.graphViewPort('updateZoom');
                }
            }

            // drag graph
            var graph_drag = d3.behavior.drag()
                //.on("dragstart", dragstart)
                //.on("drag", dragmoveSvg)
                .on("dragend", dragendSvg);

            // создаем прямоугольник , чтобы таскать за него
            svg.append('svg:rect')
                .attr({
                    'width': width,
                    'height': height,
                    'fill': 'white'
                })
                .call(graph_drag);

            var o;
            for (let i = 0; i < nodes.length; ++i) {
                (o = nodes[i]).index = i;
                o.weight = 0;
            }

            for (let i = 0; i < links.length; ++i) {
                o = links[i];
                if (typeof o.source === "number") {
                    o.source = nodes[o.source];
                }
                if (typeof o.target === "number") {
                    o.target = nodes[o.target];
                }
                ++o.source.weight;
                ++o.target.weight;
            }

            var link = svg.selectAll(".link").data(graph.links).enter().append("line")
                .attr({
                    "class": "link",
                    "id": function (d) {
                        if (vertex1 === '' + d.source.id && vertex2 === '' + d.target.id) {
                            selected_link = d3.select(this);
                        }
                        return "link_" + d.source.id + "_" + d.target.id;
                    },
                    "x1": d => d.source.x,
                    "y1": d => d.source.y,
                    "x2": d => d.target.x,
                    "y2": d => d.target.y
                })
                .on("click", d => {
                    GVP.graphViewPort('markElemClicked');
                    GVP.graphViewPort('infoTable', d.source.id, d.target.id);
                })
                .style("stroke-width", d => d.value);

            // drag
            var node_drag = d3.behavior.drag()
                .on("dragstart", dragstart)
                .on("drag", dragmove)
                .on("dragend", dragend);

            var node = svg.selectAll("g.node")
                .data(graph.nodes)
                .enter().append("svg:g")
                .attr({
                    "class": "node",
                    "id": function (d) {
                        if (vertex1 === '' + d.id && vertex2 === 'null') {
                            selected_node = d3.select(this);
                        }
                        return "node_" + d.id;
                    }
                })
                .on("mousedown", d => {
                    svg.call(d3.behavior.zoom().on("zoom", null)); // выключаем зум
                    mousedown_node = d;
                })
                .on("mouseup", () => {
                    mousedown_node = null;
                    svg.call(d3.behavior.zoom().on("zoom", rescale)); // включаем зум
                })
                .on("click", d => {
                    // отправка запроса об инфо вершины на сервер
                    if (dragged) {
                        dragged = false;
                        return;
                    }
                    GVP.graphViewPort('infoTable', d.id);
                })
                .call(node_drag);

            node.append("svg:image")
                .attr({
                    "class": "circle",
                    "x": "-20px",
                    "y": "-20px",
                    "width": "40px",
                    "height": "40px",
                    "xlink:href": d => picURL + d.group + ".svg"
                });

            node.append("svg:text")
                .attr({
                    "class": "nodetext",
                    "dx": -25,
                    "dy": 25,
                    "fill": " #2e2e2e"
                })
                .text(d => d.name);

            node.attr("transform", d => "translate(" + d.x + "," + d.y + ")");

            // выделяем узлы или связи на которые были клики
            if ('null' !== vertex1 && 'null' === vertex2) {
                if (selected_node) {
                    selectNode(selected_node);
                }
            } else if ('null' !== vertex1 && 'null' !== vertex2) {
                if (selected_link) {
                    selectLink(selected_link);
                }
            }

            function dragstart() {
                C('dragstart', arguments);
                d3.event.sourceEvent.stopPropagation();
            }

            function dragmove(d) {
                C('dragmove', arguments);
                if (d3.event.dx !== 0 || d3.event.dy !== 0) {
                    dragged = true;
                }
                d.px += d3.event.dx;
                d.py += d3.event.dy;
                d.x += d3.event.dx;
                d.y += d3.event.dy;
                tick();
            }

            function dragend() {
                C('dragend', arguments);
            }

            function tick() {
                link.attr({
                    "x1": d => d.source.x,
                    "y1": d => d.source.y,
                    "x2": d => d.target.x,
                    "y2": d => d.target.y
                });

                node.attr("transform", d => "translate(" + d.x + "," + d.y + ")");
            }

            function selectLink(curr_link) {
                C('selectLink', arguments);
                curr_link.setAttribute("class", "link_select");
                selected_link = curr_link;
            }

            function selectNode(curr_node) {
                C('selectNode', arguments);
                // меняем выделенный узел
                curr_node.select("image").remove("image");
                addNodeImage(curr_node, true);
                selected_node = curr_node;
            }

            function addNodeImage(node_to, selected) {
                C('addNodeImage', arguments);
                if (selected) {
                    node_to.append("svg:image")
                        .setAttribute({
                            "xlink:href": picURL + "vertex_active.svg",
                            "x": "-20px",
                            "y": "-20px",
                            "width": "40px",
                            "height": "40px"
                        });
                }

                node_to.append("svg:image")
                    .setAttribute({
                        "xlink:href": d => picURL + d.group + ".svg",
                        "x": "-20px",
                        "y": "-20px",
                        "width": "40px",
                        "height": "40px"
                    });
            }
        }

        // тогглы для дива привью графа
        document.querySelector('.preview-graph-button-backg').addEventListener('click', () => {
            document.querySelector('.preview-graph-div').classList.toggle('preview-graph-hide-div');
            document.querySelector('.preview-graph-button-backg').classList.toggle('preview-graph-zindex-button');
        });

        if (document.querySelector('.graph_filter_textbox_close')) {
            document.querySelector('.graph_filter_textbox_close').addEventListener('click', function () {
                // $(this).parent().first().find('.graph_filter_textbox').val('');
            });
        }
        //todo fix me - поправить этот скрипт
        if (document.querySelector('.ui-tabs .ui-tabs-nav li')) {
            document.querySelector('.ui-tabs .ui-tabs-nav li').addEventListener('click', () => {
                document.querySelector('.ui-tabs .ui-tabs-nav li').each(function () {
                    // $(this).find('.graph_info_rotate_div').removeClass('active_tab');
                });
                // $(this).find('.graph_info_rotate_div').addClass('active_tab');
            });
        }
        //todo fix me - поправить этот скрипт
        if (document.querySelector('.graph_info_table_body_td')) {
            document.querySelector('.graph_info_table_body_td').addEventListener('click', function () {
                document.querySelector('.graph_info_table_body_tr').each(function () {
                    C('JQUERY_1');
                    // $(this).removeClass('graph_info_table_active_tr');
                });
                C('JQUERY_2');
                // $(this).parent().addClass('graph_info_table_active_tr');
            });
        }

        if (document.querySelectorAll('.ui-tabs .ui-tabs-nav li')[0]) {
            document.querySelectorAll('.ui-tabs .ui-tabs-nav li')[0].querySelector('.graph_info_rotate_div').classList.add('active_tab');
        }

        //todo bag - при перетаскивании графа если мышкой заходим на другой граф начинают в консоль сыпаться ошибки... (предварительно: на функционал не влияет).

        // var coordMouseDownX = null;
        // var coordMouseDownY = null;

        var pMethods = {
            updateUserScaleCoef: (el, scaleCoef) => {
                C('pMethods.updateUserScaleCoef', arguments);
                var value;

                if (scaleCoef > 0.01) {
                    value = Math.round(scaleCoef * 100);
                } else {
                    value = Math.round(scaleCoef * 10000) / 100;
                }
                if (el.querySelector('.preview-graph-scale-label')) {
                    el.querySelector('.preview-graph-scale-label').textContent = value + '%';
                }
            },
            doZoom: (el, scaleCoef) => {
                C('pMethods.doZoom', arguments);
                var zoomRel = scaleCoef / el.dataset.origScaleCoef;
                var gNode = 'div.graph_viewport';
                // var gNode = zk.Widget.$(gvp).$n();
                var svg = d3.select(gNode).select('g');
                svg.attr("transform", " scale(" + zoomRel + ")");

                pMethods.updateUserScaleCoef(GVP, scaleCoef);
                pMethods.updateScaleCoef(GVP, scaleCoef);
            },
            updateScaleCoef: (el, scaleCoef) => {
                C('pMethods.updateScaleCoef', arguments);
                var wndX = el.offsetWidth / 2;
                var wndY = el.offsetHeight / 2;
                var offX = el.dataset.offsetX;
                var offY = el.dataset.offsetY;
                var oldCoef = el.dataset.scaleCoef;
                var newX = offX * (scaleCoef / oldCoef) - wndX * (1 - scaleCoef / oldCoef);
                var newY = offY * (scaleCoef / oldCoef) - wndY * (1 - scaleCoef / oldCoef);

                el.dataset.offsetX = newX;
                el.dataset.offsetY = newY;
                el.dataset.scaleCoef = scaleCoef;
                //console.log('updateScaleCoef offsetX : '+newX+' offsetY: '+newY+' scaleCoef: '+scaleCoef+' wndX : '+wndX+' wndY: '+wndY );
                methods.notifyAndRedraw(el);
            }
        };

        var methods = {
            init: (el, a) => {

                C('methods.init', a);

                // shitfix
                // if (el.classList && !el.classList.contains('graph_viewport')) {
                if (isInit) {
                    C("Object already is inited.");
                    return false;
                }
                isInit = true;
                // if (el.dataset.isInit) {
                //     C("Object has no class graph_viewport.");
                //     return false;
                // }

                // var graph = $('div.graph_viewport');
                // var graph = zk.Widget.$(gvp);

                el.dataset.graphVP = el;
                if (document.querySelector('.preview-graph-button-minus')) {
                    C("SET_MINUS_BUTTON");
                    document.querySelector('.preview-graph-button-minus').addEventListener('click', () => GVP.graphViewPort('zoomOut'));
                }
                if (document.querySelector('.preview-graph-button-plus')) {
                    C("SET_PLUS_BUTTON");
                    document.querySelector('.preview-graph-button-plus').addEventListener('click', () => GVP.graphViewPort('zoomIn'));
                }
                // el.mousedown(function (event) {
                //     if ($(event.target).is("div")) {
                //         coordMouseDownX = null;
                //         coordMouseDownY = null;
                //     } else {
                //         coordMouseDownY = event.pageY;
                //         coordMouseDownX = event.pageX;
                //     }
                // })
                //     .children()
                //     .click(function () {
                //         return false;
                //     });

                // el.mouseup(function (event) {
                //     if (event.pageX === coordMouseDownX && event.pageY === coordMouseDownY) {
                //         el.graphViewPort('clickOverElements');
                //     }
                // })
                //     .children()
                //     .click(function () {
                //         return false;
                //     });

                // el.parent().find('.graph_filter_button_icon').click(function () {
                //     el.graphViewPort('acceptFilters');
                // });

                // var params = {
                //     // graphId: ?? окно должно знать с каким графом оно работает...
                //     width: el.width(),
                //     height: el.height()
                // };
                // zAu.send(new zk.Event(el.data('graphVP'), 'onInit',params));

                GVP.dataset.isInit = true;
            },
            rescaleAndUpdate: (el, deltaX, deltaY, scale) => {
                C('methods.rescaleAndUpdate', arguments);
                // обновляем серверные данные
                var offsetX = el.dataset.origOffsetX - deltaX;
                var offsetY = el.dataset.origOffsetY - deltaY;
                var scaleOld = el.dataset.origScaleCoef;
                var scaleNew = scale * scaleOld; // абсолютный скейл

                //el.graphViewPort( 'updateParams' , offsetX , offsetY , scaleNew );
                el.dataset.offsetX = offsetX;
                el.dataset.offsetY = offsetY;
                el.dataset.scaleCoef = scaleNew;

                //console.log(' rescaleAndUpdate : offsetX : '+offsetX+' offsetY: '+offsetY +" scaleCoef: "+scaleNew);
            },
            updateParams: (el, origOffsetX, origOffsetY, origScaleCoef) => {
                C('methods.updateParams', arguments);
                // var graph = el.dataset.graphVP;
                //console.log(' updateParams '+graph +" : "+ origOffsetX +" ; " +origOffsetY +" ; " +origScaleCoef );

                el.dataset.origOffsetX = origOffsetX;
                el.dataset.origOffsetY = origOffsetY;
                el.dataset.origScaleCoef = origScaleCoef;
                el.dataset.offsetX = origOffsetX;
                el.dataset.offsetY = origOffsetY;
                el.dataset.scaleCoef = origScaleCoef;

                pMethods.updateUserScaleCoef(GVP, origScaleCoef);
            },
            zoomOut: el => {
                C('methods.zoomOut', arguments);
                var scaleCoef = +el.dataset.scaleCoef;
                var delta = 0.1;

                if (scaleCoef > 0.11) {
                    delta = 0.1;
                } else if (scaleCoef > 0.011) {
                    delta = 0.01;
                } else {
                    delta = 0.001;
                }
                scaleCoef -= delta;
                if (scaleCoef < 0.001) {
                    scaleCoef = 0.001;
                }

                pMethods.doZoom(GVP, scaleCoef);
            },
            zoomIn: el => {
                C('methods.zoomIn', arguments);
                var scaleCoef = +el.dataset.scaleCoef;
                var delta = 0.1;

                if (scaleCoef > 0.099) {
                    delta = 0.1;
                } else if (scaleCoef > 0.0099) {
                    delta = 0.01;
                } else {
                    delta = 0.001;
                }
                scaleCoef += delta;
                if (scaleCoef > 5) {
                    scaleCoef = 5;
                }

                pMethods.doZoom(GVP, scaleCoef);
            },
            zoomCustom: (el, scaleCoef) => {
                C('methods.zoomCustom', arguments);
                if (scaleCoef <= 0) {
                    scaleCoef = 0.1;
                }
                if (scaleCoef > 5) {
                    scaleCoef = 5;
                }

                pMethods.doZoom(GVP, scaleCoef);
            },
            updateZoom: el => {
                C('methods.updateZoom', arguments);
                var scaleCoef = el.dataset.scaleCoef;

                pMethods.updateUserScaleCoef(GVP, scaleCoef);
                pMethods.updateScaleCoef(GVP, scaleCoef);
            },

            /**
             * @todo optimize
             */
            // acceptFilters: el => {
            //     C('methods.acceptFilters', arguments);
            //     var gvp = el;
            //     let data = el.dataset;
            //     //todo fix me реализовать передачу значений из инпутов фильтров по другому
            //     gvp.parent().find('.graph_filter_textbox').each(index => { data['input' + index] = $(el).val(); });
            //     var params = {
            //         width: gvp.width(),
            //         height: gvp.height(),
            //         offsetX: data.offsetX,
            //         offsetY: data.offsetY,
            //         scaleCoef: data.scaleCoef,
            //         // type: data.type,
            //         input0: data.input0,
            //         input1: data.input1,
            //         input2: data.input2
            //     };

            //     // zAu.send(new zk.Event(gvp.data('graphVP'), 'onFiltered',params));
            // },
            clickOverElements: el => {
                C('methods.clickOverElements', arguments);
                var wasClick = el.dataset.clickElement;

                if (wasClick) {
                    el.dataset.clickElement = false;
                } else {
                    // zAu.send(new zk.Event(gvp.data('graphVP'), 'onOverClick'));
                }
            },
            notifyAndRedraw: el => {
                C('methods.notifyAndRedraw', arguments);
                methods.notify(el);
                methods.redraw(el);
            },
            notify: el => {
                C('methods.notify', el);
                // var params = {
                //     width: el.offsetWidth,
                //     height: el.offsetHeight,
                //     offsetX: el.dataset.offsetX,
                //     offsetY: el.dataset.offsetY,
                //     scaleCoef: el.dataset.scaleCoef
                // };

                // zAu.send(new zk.Event(gvp.data('graphVP'), 'onNotify',params));
            },
            redraw: el => {
                C('methods.redraw', el);
                // zAu.send(new zk.Event(el.data('graphVP'), 'onRedraw'));
            },
            markElemClicked: el => {
                C('methods.markElemClicked', arguments);
                el.dataset.clickElement = true;
            },
            // infoTable: (el, vertex1, vertex2) => {
            //     C('methods.infoTable', arguments);
            //     var params = {
            //         vertex1: "" + vertex1,
            //         vertex2: "" + vertex2
            //     };

            //     // zAu.send(new zk.Event(el.data('graphVP'), 'onInfoTable',params));
            // }
        };

        Object.prototype.graphViewPort = function (method) {
            C('graphViewPort', method);

            if (methods[method] && isInit) {
                return methods[method](GVP, ...Array.prototype.slice.call(arguments, 1));
            } else if (typeof method === 'object' || !method) {
                return methods.init(GVP, arguments);
            }

            C('Метод с именем ' + method + ' не существует для graphViewPort, либо объект не проинициализирован.');
        };

        document.querySelectorAll('div.graph_viewport').forEach(function () {
            // this.graphViewPort(); // по дефолту граф не отображается
        });

        document.getElementById('ttt').addEventListener('click', () => {
            var myjson = { "nodes": [{ "id": "-901374605477433893", "name": "ОАО ХАНТЫ-МАНСИЙСКИЙ БАНК", "group": "101", "x": 91.09128335935262, "y": 604.0 }, { "id": "5367958497831272399", "name": "044525225", "group": "103", "x": 720.7307325682357, "y": 522.339703973406 }, { "id": "2965009585941288010", "name": "8601000666", "group": "102", "x": 93.04341009017207, "y": 423.2669483394359 }, { "id": "-6507122937331912857", "name": "ОСБ РФ 4157 Биробиджанское г.Биробиджан", "group": "101", "x": 923.4846730246286, "y": 80.78531376463476 }, { "id": "8515476126564578226", "name": "40911810905000000518", "group": "104", "x": 293.77889531922756, "y": 249.13764515849857 }, { "id": "-4817557662871161469", "name": "30123810100000000062", "group": "104", "x": 543.7502610702725, "y": 294.20564470638817 }, { "id": "-8427569208098801567", "name": "7707083893", "group": "102", "x": 757.4615287198769, "y": 121.82983015408165 }, { "id": "-7091657687487650941", "name": "047144851", "group": "103", "x": 80.0, "y": 80.0 }], "links": [{ "source": 6, "target": 5, "value": 1 }, { "source": 5, "target": 1, "value": 1 }, { "source": 4, "target": 5, "value": 1 }, { "source": 4, "target": 7, "value": 1 }, { "source": 6, "target": 3, "value": 1 }, { "source": 2, "target": 4, "value": 1 }, { "source": 5, "target": 4, "value": 1 }, { "source": 2, "target": 0, "value": 1 }] };

            myjson = JSON.stringify(myjson);
            graphInit("1058", "684", myjson, 'l44Vo4', -57.183497656715005, -57.42563104339659, 2.1377681399972963, null, null);
        });
    }
);

