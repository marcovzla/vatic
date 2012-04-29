function PredicateUI(newpredbutton, newpreddialog, predcontainer, newroledialog, videoframe, job, player, tracks, predicates, groups) {
    var me = this;
    this.newpredbutton = newpredbutton;
    this.newpreddialog = newpreddialog;
    this.predcontainer = predcontainer;
    this.newroledialog = newroledialog;
    this.predname = {};
    this.rolename = {};
    this.job = job;
    this.player = player;
    this.tracks = tracks;
    this.predicates = predicates;
    this.groups = groups;
    
    this.setup = function() {
        // create newpredbutton
        this.newpredbutton.button({
            icons: { primary: "ui-icon-plusthick" },
            disabled: false
        }).click(function() {
            ui_disabled = 1;
            me.newpreddialog.dialog('open');
        });
        
        // create newpreddialog
        this.newpreddialog.dialog({
            title: 'new predicate',
            autoOpen: false,
            modal: true,
            height: 450,
            width: 350,
            buttons: {
                ok: function() {
                    // get the selected predicate type
                    var pred_id = $('input[name="predicates"]:checked').val();
                    if (!pred_id) {
                        alert('please select a predicate');
                        return;
                    }

                    var pred_instance = me.predicates.new_predicate(pred_id);

                    // add new predicate to the list
                    var newprednum = pred_instance + 1;
                    var newpredname = me.predname[pred_id];


                    $('<div class="predblock"><div style="float:left">' + 
                      newpredname + ' ' + newprednum +
                      '</div><div style="float:right">' +
                     '<div style="float:right">' +
                      '<div class="ui-icon ui-icon-trash delpredins"' +
                      ' title="delete predicate"></div></div>' +
                      '<div style="float:right">' +
                      '<div class="ui-icon ui-icon-plusthick addrole"' +
                      ' title="add track"></div></div>' +
                      '</div>' +
                      '<input type="hidden" class="predinstance_id" value="' +
                      pred_instance + '"><br></div>')
                        .hide()
                        .prependTo(me.predcontainer)
                        .show('slow');

                    // close dialog
                    $(this).dialog('close');
                },
                cancel: function() {
                    $(this).dialog('close');
                }
            },
            close: function () {
                $('#new_pred_txt').val('');
                ui_disabled = 0;
            }
        });

        $('.addrole').live('click', function(e) {
            ui_disabled = 1;
            //e.preventDefault();
            $('#available_tracks').empty();
            $('#available_groups').empty();
            for (var i in me.tracks.tracks) {
                if (me.tracks.tracks[i].deleted) {
                    continue;
                }
                $('#available_tracks').append(
                    '<input type="radio" name="avtracks" id="t' + i +
                    '" value="' + i + '"><label for="t' + i + '">' +
                    me.track_name(i) + '</label><br>');
            }
            for (var i in me.groups.data) {
                if (!me.groups.data[i]) {
                    continue;
                }
                $('#available_groups').append(
                    '<input type="radio" name="avgroups" id="g' + i +
                    '" value="' + i + '"><label for="g' + i + '">' +
                    me.groups.names[me.groups.data[i]['group']] + ' '
                    + (parseInt(i)+1) + '</label><br>');
            }
            me.newroledialog
                .data('link', $(this))
                .dialog('open');
        });

        $('input[name="avtracks"]').live('click', function () {
            $('input[name="avgroups"]').attr('checked', false);
        });

        $('input[name="avgroups"]').live('click', function () {
            $('input[name="avtracks"]').attr('checked', false);
        });

        this.newroledialog.dialog({
            title: 'add track',
            autoOpen: false,
            modal: true,
            height: 300,
            width: 400,
            close: function() {
                $('#selrole option:eq(0)').attr('selected', true);
                $('#new_role_txt').val('');
                ui_disabled = 0;
            },
            buttons: {
                ok: function() {
                    // get the selected track type
                    var track_id = $('input[name="avtracks"]:checked').val();
                    var group_id = $('input[name="avgroups"]:checked').val();
                    if (!track_id && !group_id) {
                        alert('please select a track or a group');
                        return;
                    }
                    if (track_id && group_id) {
                        alert('please select just a track or a group');
                        return;
                    }

                    var role_id = $('#selrole option:selected').val();
                    if (!role_id) {
                        alert('please add a role');
                        return;
                    }

                    var predinstance_id = $(this).data('link')
                                                 .parent()
                                                 .parent()
                                                 .siblings('.predinstance_id')
                                                 .val();

                    if (track_id) {
                        var track_added = me.predicates.add_track(predinstance_id,
                                                                  track_id);
                    }
                    else {
                        var group_added = me.predicates.add_group(predinstance_id,
                                                                  group_id);
                    }

                    if (track_id && !track_added) {
                        alert('track is already in predicate');
                        return;
                    }
                    if (group_id && !group_added) {
                        alert('group is already in predicate');
                        return;
                    }

                    if (track_added) {
                        $('<input type="checkbox" class="cbtrack" id="cbp' +
                          predinstance_id + '_' + track_id +
                          '" value="' + track_id + '_' + role_id + '">' +
                          '<label for="cbp' + predinstance_id + '_' + track_id +
                          '">' + me.track_name(track_id) + ' <small>(' + 
                          me.rolename[role_id] + ')</small></label>' +
                          '<div style="float:right">' +
                          '<div class="ui-icon ui-icon-trash delpredarg" ' +
                          'id="cbp_' + predinstance_id + '_' + track_id +
                          '" title="delete this track"></div></div><br>')
                            .hide()
                            .appendTo($(this).data('link').parent().parent().parent())
                            .show('slow');
                        // tracks should be added checked by default
                        $('#cbp' + predinstance_id + '_' + track_id)
                            .attr('checked', true)
                            .click();
                   }
                    else {
                        $('<input type="checkbox" class="cbgroup" id="cbpg' +
                          predinstance_id + '_' + group_id +
                          '" value="' + group_id + '_' + role_id + '">' +
                          '<label for="cbpg' + predinstance_id + '_' + group_id +
                          '">' + me.groups.names[me.groups.data[group_id]['group']] + ' '
                          + (parseInt(group_id)+1) + ' <small>(' + 
                          me.rolename[role_id] + ')</small></label>' +
                          '<div style="float:right">' +
                          '<div class="ui-icon ui-icon-trash delpredarg" ' +
                          'id="cbpg_' + predinstance_id + '_' + group_id +
                          '" title="delete this group"></div></div><br>')
                            .hide()
                            .appendTo($(this).data('link').parent().parent().parent())
                            .show('slow');
                        $('#cbpg' + predinstance_id + '_' + group_id)
                            .attr('checked', true)
                            .click();
                    }
                    $(this).dialog('close');
                },
                cancel: function() {
                    $(this).dialog('close');
                }
            }
        });

        $('input.cbtrack').live('click', function() {
            var predinstance_id = $(this).siblings('.predinstance_id').val();
            var trackrole = $(this).val().split('_');
            me.predicates.add_annotation(predinstance_id,
                                         trackrole[0],
                                         me.player.frame,
                                         trackrole[1],
                                         this.checked);
        });

        $('input.cbgroup').live('click', function () {
            var predinstance_id = $(this).siblings('.predinstance_id').val();
            var grouprole = $(this).val().split('_');
            me.predicates.add_group_annotation(predinstance_id,
                                               grouprole[0],
                                               me.player.frame,
                                               grouprole[1],
                                               this.checked);
        });

        $('.delpredarg').live('click', function () {
            var predtrack = $(this).attr('id').split('_');
            var pred_id = predtrack[1];
            var track_id = predtrack[2];
            if (predtrack[0] == 'cbp') {
                me.remove_track_for_pred(track_id, pred_id);
            }
            else {
                me.remove_group_for_pred(track_id, pred_id);
            }
        });

        $('.delpredins').live('click', function () {
            var pred_id = $(this).parent().parent()
                                 .siblings('.predinstance_id')
                                 .val();
            me.remove_predicate(pred_id);

        });

        this.player.onupdate.push(function() {
            me.update_checkboxes();
        });

        this.update_checkboxes = function() {
            var frame = me.player.frame;
            for (var idx in me.predicates.data) {
                if (!me.predicates.data[idx]) continue;
                for (var track_id in me.predicates.data[idx]['annotations']) {
                    var val = me.predicates.getval(idx, track_id, frame);
                    $('#cbp' + idx + '_' + track_id).attr('checked', val);
                }
                for (var group_id in me.predicates.data[idx]['group_annotations']) {
                    var val = me.predicates.getvalgrp(idx, group_id, frame);
                    $('#cbpg' + idx + '_' + group_id).attr('checked', val);
                }
            }
        }

        // add predicate to database
        me.newpreddialog.append('<input type="text" name="new_pred_txt" id="new_pred_txt">' +
                                '<button id="add_new_pred">add</button><hr>');
        $('#add_new_pred').click(function () {
            var predtxt = $('#new_pred_txt').val();
            if (!predtxt) {
                alert('please write a predicate name');
                return;
            }
            $.post('/server/savepredicateforjob/' + me.job.jobid,
                   JSON.stringify({predicate:predtxt}),
                   function (data) {
                       me.predname[data] = predtxt;
                       $('<input type="radio" name="predicates" id="p' + data +
                         '" value="' + data + '"><label for="p' + data + '">' +
                         me.predname[data] + '</label><br>')
                            .hide()
                            .appendTo(me.newpreddialog)
                            .show('slow');
                        $('#new_pred_txt').val('');
                   }
            );
        });

        me.predname = job.predicates;
        for (var p in me.predname) {
            me.newpreddialog.append('<input type="radio" name="predicates" id="p' +
                                    p + '" value="' + p + '"><label for="p' + p + '">' +
                                    me.predname[p] + '</label><br>');
        }

        me.rolename = job.roles;
        var select = $('<select id="selrole"></select>');
        for (var r in me.rolename) {
            select.append('<option value="' + r + '">' + me.rolename[r] + '</option>');
        }
        me.newroledialog.append('<label>role:</label>');
        me.newroledialog.append(select);
        me.newroledialog.append('<br><input type="text" name="new_role_txt" id="new_role_txt">' +
                                '<button id="add_new_role">add</button>');
        me.newroledialog.append('<hr><div id="available_tracks"></div>');
        me.newroledialog.append('<hr><div id="available_groups"></div>');

        $('#add_new_role').click(function () {
            var roletxt = $('#new_role_txt').val();
            if (!roletxt) {
                alert('please write a role name');
                return;
            }
            $.post('/server/saveroleforjob/' + me.job.jobid,
                   JSON.stringify({role:roletxt}),
                   function (data) {
                       me.rolename[data] = roletxt;
                       $('<option value="' + data + '">' +
                         me.rolename[data] + '</option>')
                            .appendTo('#selrole');
                       $('#new_role_txt')
                           .val('')
                           .effect('transfer', {
                               to: '#selrole',
                               className: 'ui-effects-transfer'
                           }, 500);
                   }
            );
        });
    }

    this.remove_track = function(track_id) {
        me.predicates.remove_track(track_id);
        me.predcontainer.empty();
        me.draw_my_data();
    };

    this.remove_group = function (group_id) {
        me.predicates.remove_group(group_id);
        me.predcontainer.empty();
        me.draw_my_data();
    };

    this.remove_track_for_pred = function (track_id, pred_id) {
        me.predicates.remove_track_for_pred(track_id, pred_id);
        me.predcontainer.empty();
        me.draw_my_data();
    };

    this.remove_group_for_pred = function (group_id, pred_id) {
        me.predicates.remove_group_for_pred(group_id, pred_id);
        me.predcontainer.empty();
        me.draw_my_data();
    };

    this.remove_predicate = function (pred_id) {
        me.predicates.remove_predicate(pred_id);
        me.predcontainer.empty();
        me.draw_my_data();
    };

    this.track_name = function(track_id) {
        track_id = parseInt(track_id);
        if (me.tracks.tracks[track_id].deleted) {
            return; // XXX
        }
        var objects = $('#objectcontainer').children().filter('.trackobject');
        var tid = 0;
        for (var i = 0; i < track_id; i += 1) {
            if (!me.tracks.tracks[i].deleted) {
                tid += 1;
            }
        }
        var idx = objects.length - tid - 1;
        return objects.eq(idx).find('.trackobjectheader > strong').text();
    }

    this.draw_my_data = function() {
        for (var i in me.predicates.data) {
            if (!me.predicates.data[i]) continue;
            var newprednum = parseInt(i) + 1;
            var newpredname = me.predname[me.predicates.data[i]['predicate']];
            var pred_instance = i;
            var pred = $('<div class="predblock"><div style="float:left">' +
                         newpredname + ' ' + newprednum +
                         '</div><div style="float:right">' +
                         '<div style="float:right">' +
                         '<div class="ui-icon ui-icon-trash delpredins"' +
                         ' title="delete predicate"></div></div>' +
                         '<div style="float:right">' +
                         '<div class="ui-icon ui-icon-plusthick addrole"' +
                         ' title="add track"></div></div></div>' +
                         '<input type="hidden" class="predinstance_id" ' +
                         'value="' + pred_instance + '"><br></div>')
                           .prependTo(me.predcontainer);

            for (var j in me.predicates.data[i]['annotations']) {
                var track_id = j;
                var role_id = me.predicates.data[i]['annotations'][j][0][1]; // XXX not safe
                var trackname = me.track_name(j);
                $('<input type="checkbox" class="cbtrack" id="cbp' +
                  pred_instance + '_' + track_id +
                  '" value="' + track_id + '_' + role_id + '">' + 
                  '<label for="cbp' + pred_instance + '_' + track_id +
                  '">' + trackname + ' <small>(' + me.rolename[role_id] +
                  ')</small></label><div style="float:right">' +
                  '<div class="ui-icon ui-icon-trash delpredarg" ' +
                  'id="cbp_' + pred_instance + '_' + track_id +
                  '" title="delete this track"></div></div><br>')
                    .appendTo(pred);
            }

            for (var j in me.predicates.data[i]['group_annotations']) {
                var group_id = j;
                var role_id = me.predicates.data[i]['group_annotations'][j][0][1];
                if (!me.groups.data[j]) {
                    continue;
                }
                var groupname = me.groups.names[me.groups.data[j]['group']] + ' ' + (parseInt(j)+1);
                $('<input type="checkbox" class="cbgroup" id="cbpg' +
                  pred_instance + '_' + group_id +
                  '" value="' + group_id + '_' + role_id + '">' +
                  '<label for="cbpg' + pred_instance + '_' + group_id +
                  '">' + groupname + ' <small>(' + me.rolename[role_id] +
                  ')</small></label><div style="float:right">' +
                  '<div class="ui-icon ui-icon-trash delpredarg" ' +
                  'id="cbpg_' + pred_instance + '_' + group_id +
                  '" title="delete this group"></div></div><br>')
                    .appendTo(pred);
            }
        }
        me.update_checkboxes();
    }

    this.draw_data = function() {
        $.getJSON('/server/getpredicateannotationsforjob/' + me.job.jobid, function(data) {
            if (data.length > 0) {
                me.predicates.data = data;
                me.draw_my_data();
            }
        });
    }
    
    this.setup();
}

function PredicateCollection(player, job) {
    var me = this;
    this.player = player;
    this.job = job;
    this.data = [];
    this.deleted = [];
    this.deleted_group = [];

    this.new_predicate = function(pred_id) {
        var idx = me.data.length;
        me.data.push({
            predicate: parseInt(pred_id),
            annotations: {},
            group_annotations: {}
        });
        return idx;
    }

    this.remove_predicate = function (idx) {
        me.data[idx] = null;
    };


    this.add_track = function(idx, track_id) {
        if (track_id in me.data[idx]['annotations']) {
            return false;
        }
        me.data[idx]['annotations'][track_id] = [];
        return true;
    }

    this.remove_track = function(track_id) {
        for (var pred_id in me.data) {
            if (me.data[pred_id]['annotations'].hasOwnProperty(track_id)) {
                delete me.data[pred_id]['annotations'][track_id];
            }
        }
        me.deleted.push(parseInt(track_id));
    };

    this.remove_track_for_pred = function (track_id, pred_id) {
        if (me.data[pred_id]['annotations'].hasOwnProperty(track_id)) {
            delete me.data[pred_id]['annotations'][track_id];
        }
    }

    this.add_group = function(idx, group_id) {
        if (group_id in me.data[idx]['group_annotations']) {
            return false;
        }
        me.data[idx]['group_annotations'][group_id] = [];
        return true;
    }

    this.remove_group = function (group_id) {
        for (var pred_id in me.data) {
            if (me.data[pred_id]['group_annotations'].hasOwnProperty(group_id)) {
                delete me.data[pred_id]['group_annotations'][group_id];
            }
        }
        me.deleted_group.push(parseInt(group_id));
    }

    this.remove_group_for_pred = function (group_id, pred_id) {
        if (me.data[pred_id]['group_annotations'].hasOwnProperty(group_id)) {
            delete me.data[pred_id]['group_annotations'][group_id];
        }
    }

    this.add_annotation = function(idx, track_id, frame, role_id, value) {
        var annotations = me.data[idx]['annotations'][track_id];
        for (var i in annotations) {
            var f = annotations[i][0];
            if (f >= frame) {
                annotations.splice(i);
                break;
            }
        }
        annotations.push([frame, parseInt(role_id), value]);
    }

    this.add_group_annotation = function (idx, group_id, frame, role_id, value) {
        var group_annotations = me.data[idx]['group_annotations'][group_id];
        for (var i in group_annotations) {
            var f = group_annotations[i][0];
            if (f >= frame) {
                group_annotations.splice(i);
                break;
            }
        }
        group_annotations.push([frame, parseInt(role_id), value]);
    }

    this.getval = function(idx, track_id, frame) {
        var val = false;
        var annotations = me.data[idx]['annotations'][track_id];
        for (var i in annotations) {
            var f = annotations[i][0];
            if (f > frame) {
                break;
            }
            val = annotations[i][2];
        }
        return val;
    }

    this.getvalgrp = function (idx, group_id, frame) {
        var val = false;
        var annotations = me.data[idx]['group_annotations'][group_id];
        for (var i in annotations) {
            var f = annotations[i][0];
            if (f > frame) {
                break;
            }
            val = annotations[i][2];
        }
        return val;
    };

    this.serialize = function() {
        var data = [];
        for (var pred_id in me.data) {
            var pred = me.data[pred_id];
            if (!pred) continue;
            var pred2 = {};
            pred2['predicate'] = pred['predicate'];
            pred2['annotations'] = {};
            pred2['group_annotations'] = {};
            for (var tid in pred['annotations']) {
                var ntid = parseInt(tid);
                var ntid2 = ntid;
                for (var i in me.deleted) {
                    if (ntid > me.deleted[i]) {
                        ntid2 -= 1;
                    }
                }
                pred2['annotations'][ntid2.toString()] = pred['annotations'][tid];
            }
            for (var gid in pred['group_annotations']) {
                var ngid = parseInt(gid);
                var ngid2 = ngid;
                for (var i in me.deleted_group) {
                    if (ngid > me.deleted_group[i]) {
                        ngid2 -= 1;
                    }
                }
                pred2['group_annotations'][ngid2.toString()] = pred['group_annotations'][ngid];
            }
            data.push(pred2);
        }
        return JSON.stringify(data);
    };
}
