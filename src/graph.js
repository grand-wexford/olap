/*global console, d3, $, jQuery*/
function c(funcName, a) {
    let message;
    /* eslint-disable no-console */
    funcName += a ? ': ' : '';
    a = a || '';

    if (typeof a === 'string') {
        message = a;
    } else {
        message = Array.prototype.map.call(a, function (elem) {
            return elem;
        }).join(", ");
    }

    console.log(`${funcName} ${message}`);
    return true;

    /* eslint-enable no-console */
}

// var server = 'http://192.168.50.151:8080/fw/';
var picURL = "i/";

function graphInit(width, height, myjson, uuid, origOffsetX, origOffsetY, origScaleCoef, vertex1, vertex2) {
    c('graphInit', arguments);

    var graph = JSON.parse(myjson); //add this line
    var nodes = graph.nodes;
    var links = graph.links;

    var selected_node = null;
    var selected_link = null;
    var mousedown_link = null;
    var mousedown_node = null;
    var dragged = false;
    var gNode = 'div.graph_viewport'; // доставем по айди виджета узел div куда рисовать граф

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

    var gvp = $(gNode);
    gvp.graphViewPort('updateParams', origOffsetX, origOffsetY, origScaleCoef); // обновляем параметры зума на панеле управления графом

    function dragendSvg(d, i) {
        c('dragendSvg', arguments);
        gvp.graphViewPort('notifyAndRedraw');
    }

    function rescale() {
        c('rescale', arguments);
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
        gvp.graphViewPort('rescaleAndUpdate', trans[0], trans[1], scale);
        if (scale !== 1) {
            //gvp.graphViewPort( 'rescaleAndUpdate' , 0 , 0 , scale );
            // обновляем сервер и перерисовываем
            gvp.graphViewPort('updateZoom');
        }
    }

    function mousedown() {
        c('mousedown', arguments);
        if (!mousedown_node && !mousedown_link) {
            // allow panning if nothing is selected
            svg.call(d3.behavior.zoom().on("zoom"), rescale);
            return;
        }
    }

    function mousemove() {
        c('mousemove', arguments);
        if (!mousedown_node) {
            return;
        }
    }

    function mouseup() {
        c('mouseup', arguments);
        if (mousedown_node) {
            //empty
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

    var i;
    var n = nodes.length;
    var m = links.length;
    var o;
    for (i = 0; i < n; ++i) {
        (o = nodes[i]).index = i;
        o.weight = 0;
    }

    for (i = 0; i < m; ++i) {
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
            "y1": function (d) {
                return d.source.y;
            },
            "x2": function (d) {
                return d.target.x;
            },
            "y2": function (d) {
                return d.target.y;
            }
        })
        .on("click", function (d) {
            gvp.graphViewPort('markElemClicked');
            gvp.graphViewPort('infoTable', d.source.id, d.target.id);
        })
        .style("stroke-width", function (d) {
            return d.value;
        });

    // drag
    var node_drag = d3.behavior.drag()
        .on("dragstart", dragstart)
        .on("drag", dragmove)
        .on("dragend", dragend);

    var node = svg.selectAll("g.node")
        .data(graph.nodes)
        .enter().append("svg:g")
        .attr("class", "node")
        .attr('id', function (d) {
            if (vertex1 === '' + d.id && vertex2 === 'null') {
                selected_node = d3.select(this);
            }
            return "node_" + d.id;
        })
        .on("mousedown", function (d) {
            svg.call(d3.behavior.zoom().on("zoom", null)); // выключаем зум
            mousedown_node = d;
        })
        .on("mouseup", function () {
            mousedown_node = null;
            svg.call(d3.behavior.zoom().on("zoom", rescale)); // включаем зум
        })
        .on("click", function (d) {
            // отправка запроса об инфо вершины на сервер
            if (dragged) {
                dragged = false;
                return;
            }
            gvp.graphViewPort('infoTable', d.id);
        })
        .call(node_drag);

    node.append("svg:image")
        .attr({
            "class": "circle",
            "x": "-20px",
            "y": "-20px",
            "width": "40px",
            "height": "40px",
            "xlink:href": function (d) {
                return picURL + d.group + ".svg";
            }
        });

    node.append("svg:text")
        .attr({
            "class": "nodetext",
            "dx": -25,
            "dy": 25,
            "fill": " #2e2e2e"
        })
        .text(function (d) {
            return d.name;
        });

    node.attr("transform", function (d) {
        return "translate(" + d.x + "," + d.y + ")";
    });

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

    function dragstart(d, i) {
        c('dragstart', arguments);
        d3.event.sourceEvent.stopPropagation();
    }

    function dragmove(d, i) {
        c('dragmove', arguments);
        //console.log('dragmove d3.event.dx: '+d3.event.dx+' d3.event.dy: '+d3.event.dy);
        if (d3.event.dx !== 0 || d3.event.dy !== 0) {
            dragged = true;
        }
        d.px += d3.event.dx;
        d.py += d3.event.dy;
        d.x += d3.event.dx;
        d.y += d3.event.dy;
        tick();
    }

    function dragend(d, i) {
        c('dragend', arguments);
    }

    function tick() {
        link.attr({
            "x1": function (d) { return d.source.x; },
            "y1": function (d) { return d.source.y; },
            "x2": function (d) { return d.target.x; },
            "y2": function (d) { return d.target.y; }
        });

        node.attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });
    }

    function deselectAll() {
        c('deselectAll', arguments);
        if (selected_link) {
            selected_link.attr("class", "link");
        }
        if (selected_node) { // возвращаем предыдущую выделенную врешину в прежнее состояние
            selected_node.select("image").remove("image");
            addNodeImage(selected_node, false);
        }
    }

    function selectLink(curr_link) {
        c('selectLink', arguments);
        curr_link.attr("class", "link_select");
        selected_link = curr_link;
    }

    function selectNode(curr_node) {
        c('selectNode', arguments);
        // меняем выделенный узел
        curr_node.select("image").remove("image");
        addNodeImage(curr_node, true);
        selected_node = curr_node;
    }

    function addNodeImage(node_to, selected) {
        c('addNodeImage', arguments);
        if (selected) {
            node_to.append("svg:image")
                .attr({
                    "xlink:href": picURL + "vertex_active.svg",
                    "x": "-20px",
                    "y": "-20px",
                    "width": "40px",
                    "height": "40px"
                });
        }

        node_to.append("svg:image")
            .attr({
                "xlink:href": function (d) {
                    return picURL + d.group + ".svg";
                },
                "x": "-20px",
                "y": "-20px",
                "width": "40px",
                "height": "40px"
            });
    }
}

// тогглы для дива привью графа
$('.preview-graph-button-backg').on("click", function () {
    $('.preview-graph-div').toggleClass('preview-graph-hide-div');
    $('.preview-graph-button-backg').toggleClass('preview-graph-zindex-button');
});

$('.graph_filter_textbox_close').on('click', function () {
    $(this).parent().first().find('.graph_filter_textbox').val('');
});

//todo fix me - поправить этот скрипт
$('.ui-tabs .ui-tabs-nav li').on('click', function () {
    $('.ui-tabs .ui-tabs-nav li').each(function () {
        $(this).find('.graph_info_rotate_div').removeClass('active_tab');
    });
    $(this).find('.graph_info_rotate_div').addClass('active_tab');
});

//todo fix me - поправить этот скрипт
$('.graph_info_table_body_td').on('click', function () {
    $('.graph_info_table_body_tr').each(function () {
        $(this).removeClass('graph_info_table_active_tr');
    });
    $(this).parent().addClass('graph_info_table_active_tr');
});

$(function () {
    $('.ui-tabs .ui-tabs-nav li').first().find('.graph_info_rotate_div').addClass('active_tab');
});

//todo bag - при перетаскивании графа если мышкой заходим на другой граф начинают в консоль сыпаться ошибки... (предварительно: на функционал не влияет).
(function ($) {
    var coordMouseDownX = null;
    var coordMouseDownY = null;

    var pMethods = {
        updateUserScaleCoef: function (scaleCoef) {
            c('pMethods.updateUserScaleCoef', arguments);
            var gvp = this;
            var value;

            if (scaleCoef > 0.01) {
                value = Math.round(scaleCoef * 100);
            } else {
                value = Math.round(scaleCoef * 10000) / 100;
            }
            gvp.find('.preview-graph-scale-label').text(value + '%');
        },
        doZoom: function (scaleCoef) {
            c('pMethods.doZoom', arguments);
            var gvp = this;
            var zoomRel = scaleCoef / gvp.data('origScaleCoef');
            var gNode = 'div.graph_viewport';
            // var gNode = zk.Widget.$(gvp).$n();
            var svg = d3.select(gNode).select('g');

            svg.attr("transform", " scale(" + zoomRel + ")");

            pMethods.updateUserScaleCoef.call(gvp, scaleCoef);
            pMethods.updateScaleCoef.call(gvp, scaleCoef);
        },
        updateScaleCoef: function (scaleCoef) {
            c('pMethods.updateScaleCoef', arguments);
            var gvp = this;
            var wndX = gvp.width() / 2;
            var wndY = gvp.height() / 2;
            var offX = gvp.data('offsetX');
            var offY = gvp.data('offsetY');
            var oldCoef = gvp.data('scaleCoef');
            var newX = offX * (scaleCoef / oldCoef) - wndX * (1 - scaleCoef / oldCoef);
            var newY = offY * (scaleCoef / oldCoef) - wndY * (1 - scaleCoef / oldCoef);

            gvp.data('offsetX', newX);
            gvp.data('offsetY', newY);
            gvp.data('scaleCoef', scaleCoef);
            //console.log('updateScaleCoef offsetX : '+newX+' offsetY: '+newY+' scaleCoef: '+scaleCoef+' wndX : '+wndX+' wndY: '+wndY );
            methods.notifyAndRedraw.apply(gvp);
        }
    };

    var methods = {
        init: function () {
            c('methods.init', arguments);
            if (!this.hasClass('graph_viewport')) {
                // console.log("Object already is inited.");
                return false;
            }
            if (this.data('isInit')) {
                // console.log("Object has no class graph_viewport.");
                return false;
            }
            var gvp = this;
            // var graph = $('div.graph_viewport');
            // var graph = zk.Widget.$(gvp);
            var graph = $(gvp);
            gvp.data('graphVP', graph);

            gvp.find('.preview-graph-button-minus').click(function () {
                gvp.graphViewPort('zoomOut');
            });
            gvp.find('.preview-graph-button-plus').click(function () {
                gvp.graphViewPort('zoomIn');
            });

            gvp.mousedown(function (event) {
                if ($(event.target).is("div")) {
                    coordMouseDownX = null;
                    coordMouseDownY = null;
                } else {
                    coordMouseDownY = event.pageY;
                    coordMouseDownX = event.pageX;
                }
            })
                .children()
                .click(function () {
                    return false;
                });

            gvp.mouseup(function (event) {
                if (event.pageX === coordMouseDownX && event.pageY === coordMouseDownY) {
                    gvp.graphViewPort('clickOverElements');
                }
            })
                .children()
                .click(function () {
                    return false;
                });

            gvp.parent().find('.graph_filter_button_icon').click(function () {
                gvp.graphViewPort('acceptFilters');
            });

            var params = {
                // graphId: ?? окно должно знать с каким графом оно работает...
                width: gvp.width(),
                height: gvp.height()
            };
            // zAu.send(new zk.Event(gvp.data('graphVP'), 'onInit',params));

            gvp.data('isInit', true);
        },
        rescaleAndUpdate: function (deltaX, deltaY, scale) {

            c('methods.rescaleAndUpdate', arguments);
            // пересчет локальных данных из относительных координат
            var gvp = this;
            // обновляем серверные данные
            var offsetX = gvp.data('origOffsetX') - deltaX;
            var offsetY = gvp.data('origOffsetY') - deltaY;
            var scaleOld = gvp.data('origScaleCoef');
            var scaleNew = scale * scaleOld; // абсолютный скейл

            //gvp.graphViewPort( 'updateParams' , offsetX , offsetY , scaleNew );
            gvp.data('offsetX', offsetX);
            gvp.data('offsetY', offsetY);
            gvp.data('scaleCoef', scaleNew);

            //console.log(' rescaleAndUpdate : offsetX : '+offsetX+' offsetY: '+offsetY +" scaleCoef: "+scaleNew);
        },
        updateParams: function (origOffsetX, origOffsetY, origScaleCoef) {
            c('methods.updateParams', arguments);
            var gvp = this;
            var graph = gvp.data('graphVP');
            //console.log(' updateParams '+graph +" : "+ origOffsetX +" ; " +origOffsetY +" ; " +origScaleCoef );

            gvp.data('origOffsetX', origOffsetX);
            gvp.data('origOffsetY', origOffsetY);
            gvp.data('origScaleCoef', origScaleCoef);
            gvp.data('offsetX', origOffsetX);
            gvp.data('offsetY', origOffsetY);
            gvp.data('scaleCoef', origScaleCoef);

            pMethods.updateUserScaleCoef.call(gvp, origScaleCoef);
        },
        zoomOut: function () {
            c('methods.zoomOut', arguments);
            var gvp = this;
            var scaleCoef = gvp.data('scaleCoef');
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
            pMethods.doZoom.call(gvp, scaleCoef);
        },
        zoomIn: function () {
            c('methods.zoomIn', arguments);
            var gvp = this;
            var scaleCoef = gvp.data('scaleCoef');
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
            pMethods.doZoom.call(gvp, scaleCoef);
        },
        zoomCustom: function (scaleCoef) {
            c('methods.zoomCustom', arguments);
            var gvp = this;

            if (scaleCoef <= 0) {
                scaleCoef = 0.1;
            }
            if (scaleCoef > 5) {
                scaleCoef = 5;
            }
            pMethods.doZoom.call(gvp, scaleCoef);
        },
        updateZoom: function () {
            c('methods.updateZoom', arguments);

            var gvp = this;
            var scaleCoef = gvp.data('scaleCoef');

            pMethods.updateUserScaleCoef.call(gvp, scaleCoef);
            pMethods.updateScaleCoef.call(gvp, scaleCoef);
        },

        /**
         * @todo optimize
         */
        acceptFilters: function () {
            c('methods.acceptFilters', arguments);
            var gvp = this;
            //todo fix me реализовать передачу значений из инпутов фильтров по другому
            gvp.parent().find('.graph_filter_textbox').each(function (index) {
                gvp.data('input' + index, $(this).val());
            });
            var params = {
                width: gvp.width(),
                height: gvp.height(),
                offsetX: gvp.data('offsetX'),
                offsetY: gvp.data('offsetY'),
                scaleCoef: gvp.data('scaleCoef'),
                // type: gvp.data('type'),
                input0: gvp.data('input0'),
                input1: gvp.data('input1'),
                input2: gvp.data('input2')
            };

            // zAu.send(new zk.Event(gvp.data('graphVP'), 'onFiltered',params));
        },
        clickOverElements: function () {
            c('methods.clickOverElements', arguments);
            var gvp = this;
            var wasClick = gvp.data('clickElement');

            if (wasClick) {
                gvp.data('clickElement', false);
            }
            else {
                // zAu.send(new zk.Event(gvp.data('graphVP'), 'onOverClick'));
            }
        },
        notifyAndRedraw: function () {
            c('methods.notifyAndRedraw', arguments);
            var gvp = this;
            methods.notify.apply(gvp);
            methods.redraw.apply(gvp);
        },
        notify: function () {
            c('methods.notify', arguments);
            var gvp = this;
            var params = {
                width: gvp.width(),
                height: gvp.height(),
                offsetX: gvp.data('offsetX'),
                offsetY: gvp.data('offsetY'),
                scaleCoef: gvp.data('scaleCoef')
            };

            // zAu.send(new zk.Event(gvp.data('graphVP'), 'onNotify',params));
        },
        redraw: function () {
            c('methods.redraw', arguments);
            var gvp = this;
            // zAu.send(new zk.Event(gvp.data('graphVP'), 'onRedraw'));
        },
        markElemClicked: function () {
            c('methods.markElemClicked', arguments);
            var gvp = this;
            gvp.data('clickElement', true);
        },
        infoTable: function (vertex1, vertex2) {
            c('methods.infoTable', arguments);
            var gvp = this;
            var params = {
                vertex1: "" + vertex1,
                vertex2: "" + vertex2
            };

            // zAu.send(new zk.Event(gvp.data('graphVP'), 'onInfoTable',params));
        }
    };
    $.fn.graphViewPort = function (method) {
        c('graphViewPort', method);
        if (methods[method] && this.data('isInit')) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            // $.error( 'Метод с именем ' +  method + ' не существует для jQuery.graphViewPort, либо объект не проинициализирован.' );
        }
    };

    //todo fix me при открытии нового окна будет попытка инициализации и старых окон - надо бы исправить...
    $('div.graph_viewport').ready(function () {
        $('div.graph_viewport').each(function () {
            $(this).graphViewPort(); // по дефолту граф не отображается
        });
    });

    $("#ttt").on('click', function () {
        var myjson = { "nodes": [{ "id": "-901374605477433893", "name": "ОАО ХАНТЫ-МАНСИЙСКИЙ БАНК", "group": "101", "x": 91.09128335935262, "y": 604.0 }, { "id": "5367958497831272399", "name": "044525225", "group": "103", "x": 720.7307325682357, "y": 522.339703973406 }, { "id": "2965009585941288010", "name": "8601000666", "group": "102", "x": 93.04341009017207, "y": 423.2669483394359 }, { "id": "-6507122937331912857", "name": "ОСБ РФ 4157 Биробиджанское г.Биробиджан", "group": "101", "x": 923.4846730246286, "y": 80.78531376463476 }, { "id": "8515476126564578226", "name": "40911810905000000518", "group": "104", "x": 293.77889531922756, "y": 249.13764515849857 }, { "id": "-4817557662871161469", "name": "30123810100000000062", "group": "104", "x": 543.7502610702725, "y": 294.20564470638817 }, { "id": "-8427569208098801567", "name": "7707083893", "group": "102", "x": 757.4615287198769, "y": 121.82983015408165 }, { "id": "-7091657687487650941", "name": "047144851", "group": "103", "x": 80.0, "y": 80.0 }], "links": [{ "source": 6, "target": 5, "value": 1 }, { "source": 5, "target": 1, "value": 1 }, { "source": 4, "target": 5, "value": 1 }, { "source": 4, "target": 7, "value": 1 }, { "source": 6, "target": 3, "value": 1 }, { "source": 2, "target": 4, "value": 1 }, { "source": 5, "target": 4, "value": 1 }, { "source": 2, "target": 0, "value": 1 }] };

        myjson = JSON.stringify(myjson);
        graphInit("1058", "684", myjson, 'l44Vo4', -57.183497656715005, -57.42563104339659, 2.1377681399972963, null, null);
    });

})(jQuery);