function SentenceUI(newsentencebutton, newsentencedialog, sentencecontainer, job, player, sentences) {
    var me = this;
    this.newsentencebutton = newsentencebutton;
    this.newsentencedialog = newsentencedialog;
    this.sentencecontainer = sentencecontainer;
    this.job = job;
    this.player = player;
    this.sentences = sentences;

    this.setup = function() {
        this.newsentencebutton.button({
            icons: { primary: 'ui-icon-plusthick' },
            disabled: false
        }).click(function() {
            me.newsentencedialog.dialog('open');
            // deactivate key bindings
            ui_disabled = 1;
        });

        this.newsentencedialog.dialog({
            title: 'new sentence',
            autoOpen: false,
            modal: true,
            height: 250,
            width: 450,
            buttons: {
                ok: function() {
                    var sent = $('#sentence_input').val();
                    if (!sent) {
                        alert('please write a sentence');
                        return;
                    }

                    var sent_id = me.sentences.add_sentence(sent);

                    $('<input type="checkbox" class="cbsent" id="cbs' +
                      sent_id + '" value="' + sent_id +'">' +
                      '<label for="cbs' + sent_id + '">' + sent +
                      '</label><br>')
                        .hide()
                        .appendTo(me.sentencecontainer)
                        .show('slow');

                    $(this).dialog('close');
                },
                cancel: function() {
                    $(this).dialog('close');
                }
            },
            close: function() {
                $('#sentence_input').val('');
                // activate key bindings
                ui_disabled = 0;
            }
        });

        $('input.cbsent').live('click', function() {
            var sent_id = $(this).val();
            me.sentences.add_annotation(sent_id,
                                        me.player.frame,
                                        this.checked);
        });

        this.update_checkboxes = function() {
            var frame = me.player.frame;
            for (var idx in me.sentences.data) {
                var val = me.sentences.get_value(idx, frame);
                $('#cbs' + idx).attr('checked', val);
            }
        }

        this.player.onupdate.push(function() {
            me.update_checkboxes();
        });
    }

    this.setup();
}

function SentenceCollection(player, job) {
    var me = this;
    this.player = player;
    this.job = job;
    this.data = [];

    this.add_sentence = function(sentence) {
        me.data.push({
            sentence: sentence,
            annotations: []
        });
        return me.data.length - 1;
    }

    this.add_annotation = function(idx, frame, value) {
        var annotations = me.data[idx]['annotations'];
        for (var i in annotations) {
            var f = annotations[i][0];
            if (f >= frame) {
                annotations.splice(i);
                break;
            }
        }
        annotations.push([frame, value]);
    }

    this.get_value = function(idx, frame) {
        var val = false;
        var annotations = me.data[idx]['annotations'];
        for (var i in annotations) {
            var f = annotations[i][0];
            if (f > frame) {
                break;
            }
            val = annotations[i][1];
        }
        return val;
    }

    this.serialize = function() {
        return JSON.stringify(me.data);
    }
}
