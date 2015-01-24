'use strict';

if ( typeof console === 'undefined' ) console = { log: function() {} }; // for IE

$(function() {
    db.init_parse_dashboard_directives( $('#dashboard-data').html() );
    db.init_write_html(db.stack[0].nodes);
    $('body').html( db.mkstr(db.html, db.settings) );
    db.init_final_decorating();
});

var db = {
    title: 'Dashboard',
    has: { persons: false, details: false },
    settings: {},
    url_prefixes: {},
    unique_id_seq: 0,
    stack: [ {type: 'root', nodes: []} ],
    html: [  // initial html; more added according to dashboard-data.
        '<table class="db-hdr"><tr><td class="c1">Dashboard</td>',
        '<td class="c2"></td><td class="c3">',
        '<span id="db-emails" class="db-button">Email List</span>',
        '<span id="db-details-switch" class="db-button">Show Detail</span>',
        '<a href="mydocs:open:{{THIS_FILE}}',
        '"><span id="db-edit" class="db-button">Edit</span></a>',
        '</td></tr></table>',
        '<div id="db-p-emails">',
        'List of selected ids for use in email (cut &amp; paste):<br/>',
        '<textarea id="db-p-emails-ta" rows="12" readonly="readonly" style="width:700px;"></textarea><br/><br/>',
        '<span id="db-p-emails-close">Close</span>',
        '<span id="db-p-emails-clear">Close + Clear</span>',
        '</div>'
    ],
    templates: {
        favicon: '<link rel="shortcut icon" href="http://barenakedcoder.github.io/dashboard/db.favicon.ico">',
        html: '{{html}}',
        link: '<div class="db-ele db-link"><a href="{{url}}">{{text}}{{sublinks_html}}</a>{{notes_html}}</div>',
        mlink: '<div class="db-ele db-link">{{text}}{{mlinks}}{{notes_html}}</div>',
        person: '<div class="db-ele"><input class="db-p-cb" type="checkbox" data-email="{{email}}"/>' +
            '{{name}}<span class="db-p-role">,&nbsp;&nbsp;&nbsp;&nbsp;{{role}}</span>{{notes_html}}</div>',
        //pnotes: '<p class="bm-pn">{{text}}</p>',
        note: '<ul class="db-notes"><li>{{notes_html}}</li></ul>',
        dropdown_link: '<option value="{{url}}">{{text}}</option>',
        tabs_1: '<div class="bm-tabset"><div class="bm-tabset-tabs"><ul class="bm-tabset">',
        tabs_title: '<li data-tab="#{{id}}">{{title}}</li>',
        tabs_2: '</ul></div>',
        tabs_3: '</div>',
        tab_1: '<div id="{{id}}" class="bm-tab-body" style="display:none;">',
        tab_2: '</div>',
        columns_1: '<table class="db-cols"><tbody><tr>',
        columns_2: '</tr></tbody></table>',
        calday: '{{newrow}}<td id="{{uid}}{{ymd}}"{{clazz}}><div class="db-cal-dom">{{mmmd}}{{week}}</div>{{info}}</td>',
        div_end: '</div>'
    },
    date: {
        mmmoy: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
        moy: ['01','02','03','04','05','06','07','08','09','10','11','12'],
        dom: ['xx','01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31']
    },
    regex: {
        date: /(\d{4})-?(\d{2})-?(\d{2})/
        //definition: /^\s*([\w-]+)\s*:(.*)(~(.*))?-->(.*)$/
    },
    _LINK:'link', _SUBLINK:'sublink', _HTML:'html', _DROPDOWN:'dropdown', _DROPDOWN_LINK:'dropdown_link',
    _PERSON:'person', _NOTE:'note',
    _TABS:'tabs', _TAB:'tab', _COLUMNS:'columns', _COLUMN:'column', _CALENDAR:'calendar',
    zzz: ''
};

db.init_parse_dashboard_directives = function( dashboard_definitions ) {
    var new_node, prev_node, ymd;
    var db_definitions = dashboard_definitions
        .replace(/\[!\]/g,'&#10041;').replace(/\[_\]/g,'&#9723;').replace(/\[v\]/gi,'&#10003;')
        .split('\n'); //TODO: are regex needed?

    for (var line=0, len=db_definitions.length; line<len; line++) {
        var def = db.init_parse_definition( db_definitions[line] );
        if ( def.cmd==='' || def.cmd.substring(0,2)=='//' ) {
            // ignore blank and comment lines
        } else if ( def.cmd==='set' ) {
            db.settings[def.src] = def.dst;

        //---------------- LINKS  (link|sublink|prefix)
        } else if ( def.cmd==='link' ) {
            db.stack[0].nodes.push({ type: db._LINK,
                url: db.format_url(def.dst), sublinks:[], notes:[],
                text: (def.dst.indexOf('mydocs:email:')>=0 ? '&#9993; ' : '') + def.src
            });
        } else if ( def.cmd==='sublink' ) {
            prev_node = db.stack[0].nodes[db.stack[0].nodes.length - 1];
            if (prev_node.hasOwnProperty('sublinks')) {
                prev_node.sublinks.push([def.src, db.format_url(def.dst)]);
            } else {
                db.stack[0].nodes.push({ type: db._LINK,
                    text: def.src, url: db.format_url(def.dst), sublinks:[], notes:[]
                });
            }
        } else if ( def.cmd==='prefix' ) {
            db.url_prefixes[def.src] = def.dst;

        //---------------- HTML MISC  (h1|h2|brhtml||title|dropdown)
        } else if ( def.cmd==='h1' ) {
            db.stack[0].nodes.push( {type: db._HTML, html: '<h1>'+def.all+'</h1>'} );
        } else if ( def.cmd==='h2' ) {
            db.stack[0].nodes.push( {type: db._HTML, html: '<h2>'+def.all+'</h2>'} );
        } else if ( def.cmd==='br' || def.cmd==='break' ) {
            db.stack[0].nodes.push( {type: db._HTML, html: '<br>'} );
        } else if ( def.cmd==='html' ) {
            db.stack[0].nodes.push( {type: db._HTML, html: def.all} );
        } else if ( def.cmd==='title' ) {
            db.title = def.all;
        } else if ( def.cmd==='dropdown' ) {
            new_node = { type:db._DROPDOWN, title:def.all, nodes:[] };
            db.stack[0].nodes.push(new_node);
            db.stack.unshift(new_node);
        } else if ( def.cmd==='dropdown-end' ) {
            db.stack.shift();

        //---------------- PERSON  (p|person)
        } else if ( def.cmd==='p' || def.cmd==='person' ) {
            db.stack[0].nodes.push( {type: db._PERSON, name:def.src, role: def.src_sub,
                email:def.dst, notes:[] } );
            db.has.persons = true;
        } else if ( def.cmd==='n' ) {
            prev_node = db.stack[0].nodes[db.stack[0].nodes.length - 1];
            if (prev_node.hasOwnProperty('notes')) {
                prev_node.notes.push(def.all);
                if ( prev_node.type!='note' )
                    db.has.details = true;
            } else {
                db.stack[0].nodes.push( {type: db._NOTE, notes:[def.all]} );
            }

        //---------------- NOTE
        } else if ( def.cmd==='note' ) {
            db.stack[0].nodes.push( {type: db._NOTE, notes:[def.all]} );

        //---------------- TABS & COLUMNS
        } else if ( def.cmd==='tabs' ) {
            new_node = { type: db._TABS, nodes:[] };
            db.stack[0].nodes.push(new_node);
            db.stack.unshift(new_node);
        } else if ( def.cmd==='tabs-end' ) {
            db.stack.shift();
        } else if ( def.cmd==='tab' ) {
            new_node = { type: db._TAB, id:db.unique_id('bm-tab-'), title:def.all, nodes:[] };
            db.stack[0].nodes.push(new_node);
            db.stack.unshift(new_node);
        } else if ( def.cmd==='tab-end' ) {
            db.stack.shift();
        } else if ( def.cmd==='columns' ) {
            new_node = { type: db._COLUMNS, nodes:[] };
            db.stack[0].nodes.push(new_node);
            db.stack.unshift(new_node);
        } else if ( def.cmd==='columns-end' ) {
            db.stack.shift();
        } else if ( def.cmd==='column' ) {
            new_node = { type: db._COLUMN, nodes:[] };
            db.stack[0].nodes.push(new_node);
            db.stack.unshift(new_node);
        } else if ( def.cmd==='column-end' ) {
            db.stack.shift();

        //---------------- CALENDAR
        } else if ( def.cmd==='calendar' ) {
            new_node = { type: db._CALENDAR, cals:{}, nodes:[] };
            db.stack[0].nodes.push(new_node);
            db.stack.unshift(new_node);
        } else if ( def.cmd==='calendar-end' ) {
            db.stack.shift();
        } else if ( def.cmd==='cal' ) {
            if (db.stack[0].hasOwnProperty('cals')) {
                ymd = def.src.match(db.regex.date);
                if (ymd != null) {
                    ymd = ymd[1]+'-'+ymd[2]+'-'+ymd[3];
                    if ( !db.stack[0].cals.hasOwnProperty(ymd) )
                        db.stack[0].cals[ymd] = [];
                    db.stack[0].cals[ymd].push(def.dst);
                }
            }

        //---------------- UNKNOWN
        } else {
            db.stack[0].nodes.push( {type: db._NOTE, notes:['???: ERROR: Unknown tag: ' + def.cmd]} );
        }
    }
};

db.init_write_html = function(nodes) {
    var n, i, i_max, j, j_max, x;

    for(i=0, i_max=nodes.length; i<i_max; i++) {
        n = nodes[i];

        //---------------- LINKS
        if ( n.type === db._LINK ) {
            n.notes_html = n.notes.length < 1 ?
                '' : '<ul class="db-subnotes db-detail"><li>' + n.notes.join('</li><li>') + '</li></ul>';
            n.sublinks_html = ' &nbsp;&nbsp; ';
            for (j=0, j_max=n.sublinks.length; j < j_max; j++) {
                n.sublinks_html += '<a class="db-mlink" href="' + (n.sublinks[j][1]) + '">&nbsp;' + (n.sublinks[j][0]) + '&nbsp;</a> ';
            }
            db.html.push(db.mkstr('link', n));

        //---------------- DROPDOWN
        } else if ( n.type === db._DROPDOWN ) {
            db.html.push('<select class="db-dropdown">');
            if ( n.title !== '' )
                db.html.push('<option>'+n.title+'</option>');
            for (j=0, j_max=n.nodes.length; j<j_max; j++) {
                n.nodes[j].type = db._DROPDOWN_LINK;  //TODO: verify was a 'link'
            }
            db.init_write_html(n.nodes);
            db.html.push('</select>');
        } else if ( n.type === db._DROPDOWN_LINK ) {
            db.html.push( db.mkstr(db._DROPDOWN_LINK, n) );

        //---------------- TABS & COLUMNS
        } else if ( n.type === db._TABS ) {
            db.html.push(db.templates.tabs_1);
            for (j=0, j_max=n.nodes.length; j<j_max; j++) {
                if (n.nodes[j].type === db._TAB)
                    db.html.push(db.mkstr('tabs_title', n.nodes[j]));
            }
            db.html.push(db.templates.tabs_2);
            db.init_write_html(n.nodes);
            db.html.push(db.templates.tabs_3);
        } else if ( n.type === db._TAB ) {
            db.html.push(db.mkstr('tab_1', n));
            db.init_write_html(n.nodes);
            db.html.push(db.templates.tab_2);
        } else if ( n.type === db._COLUMNS ) {
            db.html.push(db.templates.columns_1);
            db.init_write_html(n.nodes);
            db.html.push(db.templates.columns_2);
        } else if ( n.type === 'column' ) {
            db.html.push('<td>');
            db.init_write_html(n.nodes);
            db.html.push('</td>');

        //---------------- NOTE
        } else if ( n.type === db._NOTE ) {
            n.notes_html = n.notes.join('</li><li>');
            db.html.push( db.mkstr(db._NOTE, n) );

        //---------------- PERSON
        } else if ( n.type === db._PERSON ) {
            n.notes_html = n.notes.length < 1 ? ''
                : '<ul class="db-subnotes db-detail"><li>' + n.notes.join('</li><li>') + '</li></ul>';
            db.html.push( db.mkstr(db._PERSON, n) );

        //---------------- Simple Tags: apply template of same name.
        } else if ( db.templates.hasOwnProperty(n.type) ) {
            db.html.push( db.mkstr(n.type, n) );

        //---------------- CALENDAR
        } else if ( n.type === db._CALENDAR ) {
            var dates, iDate, iDateMax, ymd_max, iDateToday, ymd_today, uid, week, ymd;
            dates = [];
            for (var key in n.cals) { if (n.cals.hasOwnProperty(key)) dates.push(key) }
            dates.sort();
            x = dates[0].split('-');
            iDate = new Date(x[0], x[1]-1, x[2], 12, 0, 0);
            iDate.setDate(iDate.getDate() - iDate.getDay()); // Previous Sunday
            x = dates[dates.length-1].split('-');
            iDateMax = new Date(x[0], x[1]-1, x[2], 12, 0, 0);
            iDateMax.setDate(iDateMax.getDate() + (6-iDateMax.getDay())); // Next Saturday
            ymd_max = [iDateMax.getFullYear(), db.date.moy[iDateMax.getMonth()], db.date.dom[iDateMax.getDate()]].join('-');
            iDateToday = new Date();
            ymd_today = [iDateToday.getFullYear(), db.date.moy[iDateToday.getMonth()], db.date.dom[iDateToday.getDate()]].join('-');
            uid = db.unique_id('db-cal') +'-';
            week = 0;

            db.html.push('<table class="db-cal"><tr class="db-cal-hdr"><td>Sun</td><td>Mon</td><td>Tue</td><td>Wed</td><td>Thu</td><td>Fri</td><td>Sat</td>');
            ymd = '2000-01-01';
            while ( ymd < ymd_max ) {
                ymd = [iDate.getFullYear(), db.date.moy[iDate.getMonth()], db.date.dom[iDate.getDate()]].join('-');
                db.html.push(db.mkstr('calday', {'uid':uid, 'ymd':ymd,
                    'newrow': iDate.getDay()==0 ? '</tr><tr>' : '',
                    'mmmd':db.date.mmmoy[iDate.getMonth()]+' '+iDate.getDate(),
                    'week': iDate.getDay()==0 ? '<div class="db-cal-wk">(w='+(week++)+')</div>' : '',
                    'clazz': ymd===ymd_today ? ' class="db-cal-today"' : '',
                    'info': n.cals.hasOwnProperty(ymd) ? ('<ul class="db-cal-list"><li>' + n.cals[ymd].join('</li><li>') + '</li></ul>') : ''
                }));
                iDate.setDate(iDate.getDate() + 1);
            }
            db.html.push('</tr></table>');
        }
    }
};

db.init_parse_definition = function(def_line) {  // cmd: src [~ src_sub] --> dst
    var def = { cmd:'', src:'', src_sub:'', dst:'', all:'' };
    var i = [ def_line.indexOf(':'), def_line.indexOf('~'), def_line.indexOf('-->')];
    if ( i[0] >= 0 ) {
        def.cmd = def_line.substring(0,i[0]).trim().toLowerCase();
        if ( i[1]<0 ) {
            if ( i[2]<0 ) {
                def.src = def_line.substring(i[0]+1).trim();
            } else {
                def.src = def_line.substring(i[0]+1, i[2]).trim();
                def.dst = def_line.substring(i[2]+3).trim();
            }
        } else {
            def.src = def_line.substring(i[0]+1, i[1]).trim();
            if ( i[2]<0 ) {
                def.src_sub = def_line.substring(i[1]+1).trim();
            } else {
                def.src_sub = def_line.substring(i[1]+1, i[2]).trim();
                def.dst = def_line.substring(i[2]+3).trim();
            }
        }
        def.all = def_line.substring(i[0]+1).trim();
    }
    return def;
};

db.init_final_decorating = function() {
    /*if ( ! $.browser.msie )*/ $('title').html(db.title);
    $('.db-hdr .c2').html(db.title);
    $('head').append(db.templates.favicon);
    $('.db-dropdown').change(db.on_dropdown_change);

    $('div.bm-tabset ul li:first').addClass('on').each(function() {
        $($(this).attr('data-tab')).show();
    });
    $('div.bm-tabset ul li').click( function() {
        $(this).siblings('li').removeClass('on');
        $(this).addClass('on');
        var id = $(this).attr('data-tab');
        $(id).siblings('div.bm-tab-body').hide();
        $(id).show();
    } );


    $('body').addClass(db.has.details ? 'db-details-hide' : 'db-details-none');
    $('#db-details-switch').click(function(){
        $('body').toggleClass('db-details-hide');
        $('#db-details-switch').html( $('body').hasClass('db-details-hide') ? 'Show Details' : 'Hide Details' );
    });


/*    if (!db.has.details) {
        $('#db-detail-hider').hide();
    } else {
        $('#db-detail-hider').click(function(){
            if ( $('body').hasClass('md-detail-hide') ) {
                $('body').removeClass('md-detail-hide');
                $('#db-detail-hider').html('Hide Detail');
            } else {
                $('body').addClass('md-detail-hide');
                $('#db-detail-hider').html('Show Detail');
            }
        });
    } */

    if (!db.has.persons) {
        $('#db-emails').hide();
    } else {
        $('#db-emails').click(function(){
            var emails = [];
            $('.db-p-cb:checked').each(function(){
                emails.push( $(this).attr('data-email') );
            });
            $('#db-p-emails').show();
            $('#db-p-emails-ta').html( emails.length==0
                    ? '(select one or more persons before clicking "Email List")'
                    : emails.join('; ')
            ).focus().select();
        });
        $('#db-p-emails-close').click(function(){
            $('#db-p-emails').hide();
        });
        $('#db-p-emails-clear').click(function(){
            $('.db-p-cb:checked').attr('checked',false);
            $('#db-p-emails').hide();
        });
    }

    $('.db-cal tr:not(.db-cal-hdr) td:first-child').addClass('non-work');
    $('.db-cal tr:not(.db-cal-hdr) td:last-child').addClass('non-work');
};

db.mkstr = function(template, template_args) {  // make a string
    var html = typeof template=='string' ? db.templates[template] : template.join('');
    return html.replace(/{{\s*(\w+)\s*}}/g, function($0,$1){ return template_args[$1]; });
};

db.unique_id = function(prefix) {
    return prefix + db.unique_id_seq++;
};

db.format_url = function(url) {
    return url.replace( /^pre(fix)?(-)?(\d)+:/, function($0, $1, $2, $3) {
        return db.url_prefixes.hasOwnProperty($3) ? db.url_prefixes[$3] : '';
    });
};

db.on_dropdown_change = function() {
    var url = $('option:selected',this).val();
    if ( url !== '' )
        window.location.href = url;
};

