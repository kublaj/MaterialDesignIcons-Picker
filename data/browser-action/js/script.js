/**
 * MaterialDesignIcons-Picker
 * Browser action script
 */

(function($, window) {
    const cols = 6;

    var MaterialDesignIconsPicker = function(options) {
        this.options = options;
    };

    MaterialDesignIconsPicker.prototype = {
        ui: {},
        defaults: {
        },

        init: function() {
            this.settings = $.extend({}, this.defaults, this.options);

            this.ui = {
                body: $('body'),
                header: {
                    filter: $('#filter'),
                    version: $('#version')
                },
                icons: {
                    list: $('#icons-list'),
                    loading: $('#loading'),
                    icons: null
                },
                properties: {
                    wrap: $('#icon-properties'),
                    icon: $('#icon-icon'),
                    name: $('#icon-name'),
                    className: $('#icon-class').find('span'),
                    version: $('#icon-version'),
                    versionWrap: $('#icon-version-wrap'),
                    author: $('#icon-author'),
                    authorWrap: $('#icon-author-wrap'),
                    codepoint: $('#icon-codepoint')
                },
                footer: {
                    openInMaterialdesignIcons: $('#action-open-in-materialdesignicons'),
                    random: $('#action-random'),
                    author: $('#action-author'),
                    github: $('#action-github')
                }
            };

            this.prepareUI();
            this.fetchIcons();
        },

        prepareUI: function() {
            var self = this;

            // Filter keyup event
            var filterReplaceRegex = new RegExp('-', 'g');
            this.ui.header.filter.on('keyup', function() {
                var value = $(this).val().replace(filterReplaceRegex, ' ');

                if ($.trim(value).length == 0) {
                    self.ui.icons.icons.show();
                    return;
                }

                window.MaterialDesignIcons.icons.forEach(function(icon) {
                    icon.domElem.toggle(
                        icon.searchable.indexOf(value) != -1
                    );
                });
            });

            // Bind arrow keys
            $(document).keydown(function(e) {
                if (self.ui.header.filter.is(':focus')  // Filter has focus
                    || self.ui.icons.icons == null      // Icons not loaded yet
                    || e.which < 37 || e.which > 40)    // Not an arrow key
                    return;

                var iconWrap = self.ui.icons.icons.filter('.active'),
                    rows = Math.floor(self.ui.icons.icons.length/cols),
                    index = iconWrap.index();

                // Nothing's selected
                if (index == -1)
                    return;

                var row = iconWrap.data('row'),
                    col = iconWrap.data('col');

                switch(e.which) {
                    case 37: // left
                        col--;
                        break;
                    case 38: // up
                        row--;
                        break;
                    case 39: // right
                        col++;
                        break;
                    case 40: // down
                        row++;
                        break;
                    default: return;
                }

                if (col == 0 && row != 1) {
                    col = cols;
                    row--;
                } else if (col == cols+1 && row != rows) {
                    col = 1;
                    row++;
                }

                if (row == 0 || row > rows
                    || col == 0 || col > cols)
                    return;

                var newIndex = (row-1) * cols + col - 1;
                self.setActiveIcon($(self.ui.icons.icons[newIndex]), false, true);

                e.preventDefault();
            });

            // Footer tooltips
            this.ui.footer.openInMaterialdesignIcons.tooltip({text: 'Open in MaterialDesignIcons.com'});
            this.ui.footer.random.tooltip({text: 'Random icon'});
            this.ui.footer.author.tooltip({text: 'Quentin S.'});
            this.ui.footer.github.tooltip({text: 'GitHub'});

            // Footer actions
            this.ui.footer.random.click(function() {
                self.setActiveIcon(self.getRandomIcon(), false, true);
            });

            // Change accent color on properties icon click
            var colors = [
                'red', 'pink', 'purple', 'deep-purple', 'indigo', 'blue', 'light-blue', 'cyan', 'teal', 'green',
                'light-green', 'lime', 'yellow', 'amber', 'orange', 'deep-orange', 'brown', 'grey', 'blue-grey'
            ];
            this.ui.properties.icon.click(function() {
                if (self.ui.properties.wrap.is('.inactive'))
                    return;

                var i = colors.indexOf(self.ui.body.attr('data-accent'))+1;
                var accentColor = colors[i > colors.length-1 ? 0 : i];
                self.ui.body.attr('data-accent', accentColor);

                localStorage.setItem('color-accent', accentColor);
            });
            var accentColor = localStorage.getItem('color-accent');
            accentColor = accentColor || 'orange';
            this.ui.body.attr('data-accent', accentColor)
        },

        fetchIcons: function() {
            var self = this,
                url = typeof(chrome) !== 'undefined' && chrome.extension !== undefined
                    ? chrome.extension.getURL('data/icons.min.json')
                    : '../icons.min.json'; // <- when debugging extension directly from index.html

            $.ajax({
                dataType: 'json',
                url: url,
                success: function(data) {
                    window.MaterialDesignIcons = data;
                    self.ui.icons.loading.remove();

                    self.inflateUI();
                }
            });
        },

        inflateUI: function() {
            var self = this;

            // Inflate icons list
            var iModel = document.createElement('i');
            iModel.classList.add('mdi');

            var index = 0,
                col,
                row = 1,
                icon;

            for (var y=0, l=window.MaterialDesignIcons.icons.length; y<l; y++) {
                icon = window.MaterialDesignIcons.icons[y];
                col = (index % cols)+1;

                var i = iModel.cloneNode(false);
                i.classList.add('mdi-' + icon.name);

                icon.domElem = $(i)
                    .data('icon', icon)
                    .data('col', col)
                    .data('row', row)
                    .appendTo(self.ui.icons.list);

                if (col == cols)
                    row++;
                index++;
            }
            self.ui.icons.icons = self.ui.icons.list.children();
            self.ui.icons.list.on('click', '.mdi', function() {
                self.setActiveIcon($(this));
            });

            // Add tooltips
            self.ui.icons.icons.tooltip({
                text: function(icon) {
                    return icon.data('icon').name;
                }
            });

            this.ui.header.version.text('v' + window.MaterialDesignIcons.version);

            // Set random icon as selected
            this.setActiveIcon(this.getRandomIcon(), true);
            this.ui.icons.icons.filter('.active').removeClass('active');

            this.ui.header.filter.focus();
        },

        getRandomIcon: function() {
            return $(this.ui.icons.icons.get(
                randomInt(0, this.ui.icons.icons.length-1)
            ));
        },

        setActiveIcon: function(iconElem, fake, ensureVisible) {
            fake = fake || false;
            ensureVisible = ensureVisible || false;

            var iconMeta = iconElem.data('icon'),
                className = iconMeta.name;
            this.ui.icons.icons.filter('.active').removeClass('active');

            if (!fake) {
                iconElem.addClass('active');
                this.ui.properties.wrap.removeClass('inactive');
            }
            this.ui.properties.name.text(className);
            this.ui.properties.className.text('mdi-' + className);
            this.ui.properties.icon[0].classList = 'mdi mdi-' + className;
            this.ui.properties.version.text(iconMeta.version);
            this.ui.properties.versionWrap.toggle(iconMeta.version !== null);
            this.ui.properties.author.text(iconMeta.author);
            this.ui.properties.authorWrap.toggle(iconMeta.version !== null);
            this.ui.properties.codepoint.text(iconMeta.codepoint);
            this.ui.footer.openInMaterialdesignIcons.attr('href',
                'https://materialdesignicons.com/icon/' + className);

            if (ensureVisible) {
                var offset = iconElem.offset().top - iconElem.parent().offset().top;
                var iconElemHeight = iconElem.outerHeight(true);

                var scrollTop = iconElem.parent().scrollTop(),
                    initialScrollTop = scrollTop;
                if (offset - 5 < 0)
                    scrollTop += offset - 5;
                else if (offset + iconElemHeight > iconElem.parent().height())
                    scrollTop += offset + iconElemHeight - iconElem.parent().height();

                if (scrollTop != initialScrollTop)
                    iconElem.parent().scrollTop(scrollTop);
            }
        }
    };

    window.MaterialDesignIconsPicker = MaterialDesignIconsPicker;
})($, window);

$(document).ready(function() {
    window.picker = new MaterialDesignIconsPicker();
    window.picker.init();
});

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
