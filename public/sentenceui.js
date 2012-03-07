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
    }

    this.setup();
}

function SentenceCollection(player, job) {
    var me = this;
    this.player = player;
    this.job = job;
    this.data = [];

    this.serialize = function() {
        return JSON.stringify(me.data);
    }
}
