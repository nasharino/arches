require([
    'jquery',
    'underscore',
    'knockout',
    'arches',
    'views/search-base-manager',
    'views/resource/editor/form-list',
    'views/resource/editor/form',
    'models/card',
    'viewmodels/alert',
    'resource-editor-data',
    'bindings/sortable',
    'bindings/let'
], function($, _, ko, arches, SearchBaseManagerView, FormList, FormView, CardModel, AlertViewModel, data) {
    var self = this;
    var loading = ko.observable(false);
    var cardLoading = ko.observable(false);
    var displayName = ko.observable(data.displayName);
    var formList = new FormList({
        forms: ko.observableArray(data.forms)
    });
    formList.selectItem(formList.items()[0]);

    var formView = new FormView({
        formid: formList.items()[0].formid,
        resourceid: data.resourceid,
        tiles: data.tiles,
        blanks: data.blanks
    });

    var loadForm = function(form) {
        cardLoading(true);
        formView.loadForm(form.formid, function(){
            cardLoading(false);
        });
    };

    formList.on('item-clicked', function(form){
        if (pageView.viewModel.dirty()) {
            pageView.viewModel.alert(new AlertViewModel('ep-alert-blue', arches.confirmNav.title, arches.confirmNav.text, function(){
                pageView.viewModel.showConfirmNav(false);
            }, function() {
                loadForm(form);
            }));
        } else {
            loadForm(form);
        }
    });

    formView.on('before-update', function(){
        cardLoading(true);
    });
    formView.on('after-update', function(response){
        cardLoading(false);
        var updateDisplayName = function(){
            var name = displayName;
            return function(val) {
                name(val.displayname)
            }
        }
        var errorMessageTitle = arches.requestFailed.title
        var errorMessageText = arches.requestFailed.text
        pageView.viewModel.alert(null);
        if(response.status != 200){
            if (response.responseJSON) {
              errorMessageTitle = response.responseJSON.message[0]
              errorMessageText = response.responseJSON.message[1]
            }
            pageView.viewModel.alert(new AlertViewModel('ep-alert-red', errorMessageTitle, errorMessageText));
        } else {
            $.get(arches.urls.resource_descriptors + this.resourceid, updateDisplayName());
        }
    });

    /**
    * a PageView representing the resource listing and recent edits page
    */
    var pageView = new SearchBaseManagerView({
        viewModel:{
            loading: loading,
            cardLoading: cardLoading,
            displayName: displayName,
            resourceEditorContext: true,
            editingInstanceId: data.resourceid,
            relationship_types: data.relationship_types,
            graph: data.graph,
            formList: formList,
            formView: formView,
            openRelatedResources: ko.observable(false),
            dirty: ko.computed(function() {
                var dirty = false;
                _.each(formView.formTiles(), function (tile) {
                    if (tile.dirty()) {
                        dirty = true;
                    }
                });
                return dirty;
            }),
            deleteResource: function(){
                pageView.viewModel.alert(new AlertViewModel('ep-alert-red', arches.confirmResourceDelete.title, arches.confirmResourceDelete.text, function() {
                    return;
                }, function(){
                    loading(true);
                    $.ajax({
                        type: "DELETE",
                        url: arches.urls.resource_editor + data.resourceid,
                        success: function(response) {

                        },
                        error: function(response) {

                        },
                        complete: function (request, status) {
                            loading(false);
                            if (status === 'success') {
                                pageView.viewModel.navigate(arches.urls.resource);
                            }
                        },
                    });
                }));
            }
        }
    });

    pageView.viewModel.searchResults.relationshipCandidates.subscribe(function () {
        if (!pageView.viewModel.openRelatedResources()) {
            pageView.viewModel.openRelatedResources(true);
        }
        if (pageView.viewModel.selectedTab() !== pageView.viewModel.relatedResourcesManager) {
            pageView.viewModel.selectedTab(pageView.viewModel.relatedResourcesManager);
        }
    });
});
