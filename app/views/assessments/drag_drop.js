//Filename: views/assessments/drag_drop.js

define([
    'jquery',
    'underscore',
    'backbone',
    'fabric',
    'text!templates/dragDrop.html',
    'text!templates/dragDropAuthoringButtons.html',
    'jquery-sidr',
    'bootstrap',
    'jquery-migrate',
    'jquery-ui-1-10/accordion',
    'jquery-ui-1-10/datepicker',
    'jquery-ui-1-10/sortable',
    'jquery-ui-1-10/droppable',
    'jquery-ui-1-10/draggable'
//    'jquery-ui-1-10'
], function ($, _, Backbone, fabric, DragDropTemplate, ButtonsTemplate) {
    var _isDrawing = false,
            _startX = 0,
            _startY = 0,
            _xmlCR = '\n',
            _scale = 1,
            _images = [],
            _targets = [],
            _canvas,
            _origWidth,
            _prevObj,
            _targetType;

    function addDraggable () {
        var draggableInput = $('#draggableFile')[0];
        var currentTarget = $('#currentDraggables');
        var images = draggableInput.files;
        var currentHtml = '';
        var currentImgId = '';

        _.each(images, function(img) {
            currentHtml = currentDraggable();
            currentImgId = $(currentHtml).data('img-id');
            currentTarget.append(currentHtml);
            updateSolutionOptions(getCurrentItemId(currentHtml), 'draggable');
            previewImage(img, currentImgId, function () {
            });
        });

        currentTarget.find('span.labelInput')
                .css('width', '0px')
                .hide();
        currentTarget.find('i.hideLabel')
                .hide();
        currentTarget.find('.previewDraggable')
            .draggable({
                revert : true  // we want to keep a copy in the draggables list
            });
    }

    function addSolution (_type) {
        var template = '<span>' +
                       '    <select class="solutionInput solutionDraggable" value="">' +
                                currentDraggablesForSelect() +
                       '    </select>' +
                       '</span>' +
                       '<span>' +
                       '    <select class="solutionInput solutionTarget" value="">' +
                                currentTargetsForSelect() +
                       '    </select>' +
                       '</span>';
        var cloneMe = '<span class="cloneMe">' +
                      template +
                      '<i class="fa fa-trash-o pointer pull-right removeSolutionRow" title="Delete"></i>' +
                      '</span>';
        var html = '<li data-type="' + _type + '" class="clearfix list-group-item currentSolution">' +
                   '    <p class="text-center">' + _type +
                   '        <i class="fa fa-plus btn btn-sm btn-success pull-left addSolutionRow" title="Add"></i>' +
                   '    </p>' +
                   cloneMe +
                   '</li>';
        $('#currentSolutions').append(html);
    }

    function backgroundImage () {
        if (cutDraggables()) {
            var cutImages = generateCutImagesList();
            return cutImages['background'].toDataURL('image/png');
        } else {
            return '/static/' + $('#imageName').text().trim();
        }
    }

    function canReuse (ele) {
        return $(ele).children('span.reuse')
                .children('input[type="checkbox"]')
                .prop('checked');
    }

    function checkDraggable (id) {
        var draggables = $('.currentDraggable');
        var target;
        _.each(draggables, function (item) {
            if (getCurrentItemId(item) === id) {
                target = item;
            }
        });
        $(target).find('span.reuse')
                .children('input[type="checkbox"]')
                .prop('checked', true);
    }

    function checkMultiDrop (state) {
        $('#multiplePerTarget').prop('checked', state);
    }

    function cleanUpSolutions (ele) {
        if ($(ele).hasClass('removeDraggable')) {
            var solutions = $('.solutionDraggable');
        } else if ($(ele).hasClass('removeTarget')) {
            var solutions = $('.solutionTarget');
        } else {
            return false;
        }
        var id = getCurrentItemId(ele);
        _.each(solutions, function (item) {
            if ($(item).val() === id) {
                $(item).val('');
            }
        });
    }

    function clearDraggables () {
        $('#currentDraggables').find('.removeDraggable')
                .click();
    }

    function clearSolutions () {
        $('#currentSolutions').find('.removeSolutionRow')
                .click();
    }

    function clearStatus () {
        $('.statusBox').text('');
    }

    function clearTargets () {
        $('#currentTargets').find('.removeTarget')
                .click();
    }

    function cloneSolution (ele) {
        // find the nearest "cloneMe" row
        // clone it
        // reset the inputs
        // append it to after the row
        var template = $(ele).parent()
                .siblings('span.cloneMe')
                .last()
                .clone();
        $(template).find('input')
                .val('');
        $(ele).parent()
                .parent()
                .append(template);
    }

    function closeTargetOptions () {
        if ($('#targetsOptions').is(':visible')) {
            $('#targetsBtn').click();
        }
        if ($('#targetsBtn').hasClass('active')) {
            $('#targetsBtn').click();
        }
    }

    function correctAnswer () {
        var items = $('.currentSolution');
        var retVal = 'correct_answer=[';
        var _solutionDraggables, _draggables,
                _solutionTargets, _targets;
        _.each(items, function (item) {
            _solutionDraggables = $(item).find('.solutionDraggable');
            _draggables = getValues(_solutionDraggables, 'draggable');
            _solutionTargets = $(item).find('.solutionTarget');
            _targets = getValues(_solutionTargets, 'target');
            retVal += '{' +
                      '"draggables":' + _draggables + ',' +
                      '"targets":' + _targets + ',' +
                      '"rule":"' + rule(item) + '"},';
        });
        retVal = stripTrailingComma(retVal);
        retVal += ']' + _xmlCR;
        return retVal;
    }

    function createCutDraggables () {
        if (cutDraggables()) {
            // Only do this if the cutDraggables option is enabled
            // take each object from _targets and clone the
            // background data into a Draggables.
            var $t = $('#currentDraggables'),
                cutImages, draggableHtml;

            $t.empty();

            cutImages = generateCutImagesList()['targets'];
            _.each(cutImages, function (draggable) {
                draggableHtml = currentDraggable();
                $t.append(draggableHtml);
                $t.find('li:last')
                    .find('img.previewDraggable')
                    .attr('src', draggable);
                updateSolutionOptions(getCurrentItemId(draggableHtml), 'draggable');
            });

            $t.find('span.labelInput')
                .css('width', '0px')
                .hide();
            $t.find('i.hideLabel')
                .hide();
        }
    }

    function currentDraggable () {
        var numExisting = $('.currentDraggable').length,
                nextNumber = numExisting + 1;
        return '<li class="list-group-item clearfix currentDraggable" ' +
                    'data-img-id="currentDraggable_' + nextNumber + '">' +
                '    <i class="fa fa-trash-o pointer pull-right removeDraggable" title="Delete"></i>' +
                '    <i class="fa fa-tag pointer pull-right draggableLabel" data-label="" title="No Label--click to add"></i>' +
                '    <span class="labelInput pull-right">' +
                '        <input type="text" maxlength="16" placeholder="Label"/>' +
                '        <i class="fa fa-chevron-left hideLabel pointer pull-right"></i>' +
                '    </span>' +
                '    <span class="badge idField" contenteditable>ID: d_' + nextNumber + '</span>' +
                '    <span class="dragHandle"></span>' +
                '    <img class="previewDraggable" id="currentDraggable_' + nextNumber + '"/>' +
                '    <span class="reuse pull-right">Reuse? <input type="checkbox"/></span>' +
                '</li>';
    }

    function currentDraggablesForSelect () {
        var draggables = $('.currentDraggable');
        var retVal = '<option value="" selected>Draggables</option>';
        var displayId;
        _.each(draggables, function (draggable) {
            displayId = getCurrentItemId(draggable);
            retVal += '<option value="' + displayId + '">' + displayId + '</option>';
        });
        return retVal;
    }

    function currentTarget () {
        var numExisting = $('.currentTarget').length,
                nextNumber = numExisting + 1;
        return '<li class="list-group-item pointer currentTarget" ' +
                    'data-tar-id="currentTarget_' + nextNumber + '">' +
                '    <i class="fa fa-trash-o pointer pull-right removeTarget"></i>' +
                '    <span class="badge idField" contenteditable>ID: t_' + nextNumber + '</span>' +
                '    <i class="objectImg fa" id="currentTarget_' + nextNumber + '" data-obj=""></i>' +
                '</li>';
    }

    function currentTargetsForSelect () {
        var targets = $('.currentTarget');
        var retVal = '<option value="" selected>Targets</option>';
        var displayId;
        _.each(targets, function (target) {
            displayId = getCurrentItemId(target);
            retVal += '<option value="' + displayId + '">' + displayId + '</option>';
        });
        return retVal;
    }

    function cutDraggables () {
        return $('#cutDraggables').prop('checked');
    }

    function dimensions (ele) {
        var obj = $(ele).children('i.objectImg')
                .data('obj');
        var retVal = '';
        if (isRect(ele)) {
            // x, y are top left, then w and h
            retVal += 'x="' + Math.floor(_scale * obj.left) + '" ' +
                      'y="' + Math.floor(_scale * obj.top) + '" ';
            retVal += 'w="' + Math.floor(_scale * obj.width) + '" ' +
                      'h="' + Math.floor(_scale * obj.height) + '"';
        } else {
            // x, y are center of circle, then radius
            retVal += 'x="' + Math.floor(_scale * (obj.left + obj.radius / Math.sqrt(2))) + '" ' +
                      'y="' + Math.floor(_scale * (obj.top + obj.radius / Math.sqrt(2))) + '" ';
            retVal += 'r="' + Math.floor(_scale * obj.radius) + '"';
        }
        return retVal;
    }

    function disableTargetDrawing () {
        $('.upper-canvas').removeClass('crosshairs');
        drawingEvents('remove');
    }

    function displayName () {
        return $('#displayName').val();
    }

    function draggablesPresent () {
        if ($('#currentDraggables').children('li').length > 0) {
            return true;
        } else {
            return false;
        }
    }

    function drawingEvents (type) {
        // Drawing examples from here:
        // http://pastebin.com/vV8e6UbC
        if (type === 'bind') {
            _canvas.on('mouse:down', setMouseDown);
            _canvas.on('mouse:move', setMouseMove);
            _canvas.on('mouse:up', setMouseUp);
        } else {
            _canvas.off('mouse:down', setMouseDown);
            _canvas.off('mouse:move', setMouseMove);
            _canvas.off('mouse:up', setMouseUp);
        }
    }

    function enableTargetDrawing () {
        $('.upper-canvas').addClass('crosshairs');
        drawingEvents('bind');
    }

    function generateCutImagesList () {
        var context, backBuffer, backImg,
            imgTmp, backContext, buffer,
            bufferContext, scaledW, scaledH,
            imgData, targetX, targetY,
            targetR, targetH, targetW,
            results;
        results = {};
        _canvas.deactivateAll();
        _canvas.renderAll();
        context = _canvas.getContext('2d');

        // first create a buffer for the new background
        backBuffer = document.createElement('canvas');
        backBuffer.width = _canvas.width;
        backBuffer.height = _canvas.height;
        // load in the background image
        backImg = new fabric.Image($('#backgroundImage')[0], {
            left    : 0,
            top     : 0,
            width   : _canvas.width,
            height  : _canvas.height
        });
        // need to make this a DOM image, to load it onto the canvas?
        imgTmp = new Image();
        imgTmp.src = backImg.toDataURL();

        backContext = backBuffer.getContext('2d');
        backContext.drawImage(imgTmp, 0, 0);

        results['background'] = backBuffer;
        results['targets'] = [];

        // Now for each of the targets, create an image for the target
        // as well as overlay that exact position in backBuffer with
        // a white box / circle with dashed border
        // Circular clipping described here:
        // http://stackoverflow.com/questions/8609739/how-to-get-a-non-rectangular-shape-using-getimagedata
        // Using JS encoder from here, to convert my clips to PNG:
        // https://github.com/wheany/js-png-encoder
        _.each(_targets, function (_target) {
            buffer = document.createElement('canvas');
            bufferContext = buffer.getContext('2d');

            try {
                scaledW = _target.width * _target.scaleX;
                scaledH = _target.height * _target.scaleY;
                imgData = backContext.getImageData(_target.left,
                    _target.top,
                    scaledW,
                    scaledH);
                buffer.width = scaledW;
                buffer.height = scaledH;
            } catch (e) {
                scaledW = _target.width;
                scaledH = _target.height;
                imgData = backContext.getImageData(_target.left,
                    _target.top,
                    scaledW,
                    scaledH);
                buffer.width = scaledW;
                buffer.height = scaledH;
            }

            // for circular targets, clip this:
            if (_targetType === 'circle') {
                targetX = scaledW / 2;
                targetY = scaledH / 2;
                targetR = scaledW / 2;
                bufferContext.beginPath();
                bufferContext.arc(targetX, targetY, targetR, 0, Math.PI * 2, true);
                bufferContext.clip();

                // Need to use drawImage instead of putImageData because
                // per spec, putImageData is not affected by clip.
                bufferContext.drawImage(imgTmp, -_target.left, -_target.top);

                // create a new white blob with outline
                // http://www.html5canvastutorials.com/tutorials/html5-canvas-circles/
                targetX = _target.left + scaledW / 2;
                targetY = _target.top + scaledH / 2;
                backContext.beginPath();
                backContext.setLineDash([5]);
                backContext.arc(targetX, targetY, targetR, 0, Math.PI * 2, true);
                backContext.fillStyle = 'white';
                backContext.fill();
                backContext.stroke();
            } else {
                bufferContext.putImageData(imgData, 0, 0);

                // create a new white blob with outline
                // http://www.html5canvastutorials.com/tutorials/html5-canvas-rectangles/
                targetX = _target.left;
                targetY = _target.top;
                targetW = scaledW;
                targetH = scaledH;
                backContext.beginPath();
                backContext.setLineDash([5]);
                backContext.rect(targetX, targetY, targetW, targetH);
                backContext.fillStyle = 'white';
                backContext.fill();
                backContext.stroke();
            }

            results['targets'].push(buffer.toDataURL('image/png'));
        });
        return results
    }

    function getCurrentItemId (ele) {
        if ($(ele).hasClass('idField')) {
            var idText = $(ele).text();
            if (idText.indexOf('ID:') >= 0) {
                var retVal = idText.split(':')[1]
                        .trim();
            } else {
                var retVal = idText.trim();
            }
        } else if ($(ele).is('span') || $(ele).is('i')) {
            var idText = $(ele).siblings('span.idField')
                    .text();
            if (idText.indexOf('ID:') >= 0) {
                var retVal = idText.split(':')[1]
                        .trim();
            } else {
                var retVal = idText.trim();
            }
        } else if ($(ele).is('li')) {
            var idText = $(ele).children('span.idField')
                    .text();
            if (idText.indexOf('ID:') >= 0) {
                var retVal = idText.split(':')[1]
                        .trim();
            } else {
                var retVal = idText.trim();
            }
        } else if ($(ele).is('input')) {
            var retVal = $(ele).val()
                .trim();
        } else if ($(ele).is('select.solutionDraggable,select.solutionInput')) {
            var retVal = $(ele).val();
        } else {
            var retVal = '';
        }
        return retVal;
    }

    function getDraggables () {
        var items = $('.currentDraggable');
        var returnValue = '';
        _.each(items, function (item) {
            returnValue += '      <draggable id="' + getCurrentItemId(item) + '"' +
                           '  icon="' + getItemFile(item) + '"' +
                           '  can_reuse="' + canReuse(item) + '" ';
            if (showLabelsInXML()) {
                returnValue += '  label="' + label(item) + '"';
            }
            returnValue += '/>' + _xmlCR;
        });
        return returnValue;
    }

    function getHeight (id) {
        return $('#' + id).height();
    }

    function getItemFile (ele) {
        if (cutDraggables()) {
            var cutImages = generateCutImagesList();
            return $(ele).children('img.previewDraggable')
                .attr('src');
        } else {
            return '/static/' + $(ele).children('img.previewDraggable')
                .data('filename');
        }
    }

    function getTargets () {
        var items = $('.currentTarget');
        var returnValue = '';
        _.each(items, function (item) {
            returnValue += '      <target id="' + getCurrentItemId(item) + '" ' +
                               dimensions(item) +
                           '/>' + _xmlCR;
        });
        return returnValue;
    }

    function getValues (elementList, type) {
        var values = _.map(elementList, function (ele) {
                return $(ele).val();
        });
        var retVal = [];
        _.each(values, function (val) {
            if (val !== '' && typeof val !== 'undefined') {
                if (!longForm() && type === 'target') {
                    retVal.push(shortDimensions(val));
                } else {
                    retVal.push(val);
                }
            }
        });
        return JSON.stringify(retVal);
    }

    function getWidth (id) {
        return $('#' + id).width();
    }

    function grabCutImages () {
        // take the background image and put it into a temporary canvas
        // On the locations of the targets, place a white circle / rectangle
        //   in the temporary canvas, with dashed outline.
        // Cut what was there originally and save it into a new image (following
        //   the process in grabNewDraggableImages())
        // Put all of these images with modified background into the
        //   downloadCutImages-right sidr
        var $t = $('#downloadCutImages-right'),
            cutImages;
        $t.empty();
        $t.append('<div>Right click to save your new images</div>');

        cutImages = generateCutImagesList();
        _.each(cutImages['targets'], function (image) {
            $t.append('<div><img src="' + image + '"/></div>');
        });

        $t.append('<img src="' + cutImages['background'].toDataURL('image/png') + '"/>');
    }

    function grabNewDraggableImages () {
        // get the image objects from the _images array
        // copy the locations on the _canvas
        // export as imageUrls?
        //   * https://stackoverflow.com/questions/14737677/fabricjs-copy-part-of-canvas-to-another-canvas/14833954#14833954
        // put into downloadDraggables-right as new images?
        var $t = $('#downloadDraggables-right'),
            context, buffer, bufferContext, imgData;
        $t.empty();
        $t.append('<div>Right click to save your new images</div>');
        _canvas.deactivateAll();
        _canvas.renderAll();
        context = _canvas.getContext('2d');
        _.each(_images, function (_img) {
            buffer = document.createElement('canvas');
            bufferContext = buffer.getContext('2d');

            try {
                imgData = context.getImageData(_img.left,
                    _img.top,
                    _img.width * _img.scaleX,
                    _img.height * _img.scaleY);
                buffer.width = _img.width * _img.scaleX;
                buffer.height = _img.height * _img.scaleY;
            } catch (e) {
                imgData = context.getImageData(_img.left, _img.top, _img.width, _img.height);
                buffer.width = _img.width;
                buffer.height = _img.height;
            }
            bufferContext.putImageData(imgData, 0, 0);
            $t.append('<img src="' + buffer.toDataURL('image/png') + '"/>');
        });
    }

    function graded () {
        return $('#graded').prop('checked');
    }
//
//    function draggable () {
//        // Return the html for a draggable item...keep track of how many
//        var numExisting = $('.draggable').length,
//                nextNumber = numExisting + 1;
//        return '<span data-img-id="draggableIcon_' + nextNumber + '" ' +
//                    'class="draggable pointer">' +
//                '<img id="draggableIcon_' + nextNumber + '" ' +
//                    'class="draggable-icon"/>' +
//                '</span>';
//    }

    function isRect (ele) {
        if ($(ele).children('i.objectImg')
                .hasClass('fa-square-o')) {
            return true;
        } else {
            return false;
        }
    }

    function label (ele) {
        var label = $(ele).children('i.draggableLabel')
                .data('label');
        return label !== '' ? label : getCurrentItemId(ele);
    }

    function longForm () {
        return $('#longForm').prop('checked');
    }

    function maxAttempts () {
        return $('#attempts').val();
    }

    function multiDrop () {
        return !$('#multiplePerTarget').prop('checked');
    }

    function noLabels () {
        return $('#noLabels').prop('checked');
    }

    function previewBackgroundPresent () {
        if ($('#backgroundImage').attr('src') === '') {
            return false;
        } else {
            return true;
        }
    }

    function previewImage (file, target, callback) {
        if (file) {
            var reader = new FileReader();
            var dimensions = {};
            reader.onload = function (e) {
                $('#' + target).attr('src', e.target.result)
                        .data('filename', file.name)
                        .attr('title', file.name);

                dimensions['height'] = $('#' + target)[0].height;
                dimensions['width'] = $('#' + target)[0].width;

                if (target === 'backgroundImage') {
                    $('#' + target).css('width', dimensions['width'] + 'px');
                    $('#imageName').html('<h4>' + file.name + '</h4>');
                }
                callback(dimensions);
            };

            reader.readAsDataURL(file);
        }
    }

    function problemIntro () {
        return $('#introText').children('textarea').val();
    }

    function problemQ () {
        return $('#qText').children('textarea').val();
    }

    function refreshXml () {
        var target = $('#xml-right');
        target.empty();
        var wrapper = '<div id="xlm_data">' +
                      '    <textarea readonly rows="50" id="xmlText">' +
                      '    </textarea>' +
                      '</div>';
        var data = '<problem display_name="' + displayName() + '" markdown="null" ' +
                   '  max_attempts="' + maxAttempts() + '" showanswer="' + showAnswer() + '"' +
                   '  rerandomize="' + rerandomize() + '" graded="' + graded() + '"' +
                   '  weight="' + weight() + '"' +
                   '  >' + _xmlCR +
                   '  <p class="problemIntro">' + problemIntro() + '</p>' + _xmlCR +
                   '  <p class="problemQ">' + problemQ() + '</p>' + _xmlCR +
                   '  <customresponse>' + _xmlCR +
                   '    <drag_and_drop_input img="' + backgroundImage() + '"' +
                   '    target_outline="' + showOutline() + '" one_per_target="' + multiDrop() + '"' +
                   '    no_labels="' + noLabels() + '">' + _xmlCR +
                          getDraggables();
        if (longForm()) {
            data += getTargets();
        }
        data +=    '    </drag_and_drop_input>' + _xmlCR +
                   '    <answer type="loncapa/python">' + _xmlCR +
                          correctAnswer() +
                   'if draganddrop.grade(submission[0], correct_answer):' + _xmlCR +
                   '    correct = ["correct"]' + _xmlCR +
                   'else:' + _xmlCR +
                   '    correct = ["incorrect"]' + _xmlCR +
                   '    </answer>' + _xmlCR +
                   '  </customresponse>' + _xmlCR +
                   '</problem>';
        target.append(wrapper);
        $('#xmlText').val(data);
    }

    function removeSolution (ele) {
        // remove the parent().parent() <span> object
        // check if that is the last one in the <li>
        // if there are no more <span>'s, remove the <li>
        var allSolutions = $(ele).parent()
                .siblings('span.cloneMe'); // self is not found here
        if (allSolutions.length === 0) {
            $(ele).parent()
                    .parent()
                    .remove();
        } else {

            $(ele).parent()
                    .remove();
        }
    }

    function removeSolutionOptions (id) {
        $('.solutionInput').find('option[value="' + id + '"]')
                .remove();
    }

    function rerandomize () {
        return $('#rerandomize').val();
    }

    function resetBtns () {
        $('#targetsOptions').hide();
        $('#solutionsOptions').hide();
        $('.leftPane').find('.active')
                .removeClass('active');
    }

    function reSortDraggableIds () {
        var draggables = $('.currentDraggable');
        _.each(draggables, function (item, ind) {
            var adjustedInd = ind + 1;
            var oldId = $(item).data('img-id');
            var oldDisplay = 'd_' + oldId.split('_')[1];
            var newId = 'currentDraggable_' + adjustedInd;
            var newDisplay = 'd_' + adjustedInd;
            $(item).data('img-id', newId);
            $(item).children('span.badge')
                    .text('ID: d_' + adjustedInd);
            $(item).children('img')
                    .attr('id', newId);
            updateTargetLinks(oldDisplay, newDisplay, 'draggable');
        });
    }

    function reSortTargetIds () {
        // Need to also recreate the _targets array
        // that is storing things for the cutImages data.
        var targets = $('.currentTarget');
        _targets = [];
        _.each(targets, function (item, ind) {
            var adjustedInd = ind + 1;
            var oldId = $(item).data('tar-id');
            var oldDisplay = 't_' + oldId.split('_')[1];
            var newId = 'currentTarget_' + adjustedInd;
            var newDisplay = 't_' + adjustedInd;
            $(item).data('tar-id', newId);
            $(item).children('span.badge')
                    .text('ID: t_' + adjustedInd);
            $(item).children('i.objectImg')
                    .attr('id', newId);
            updateTargetLinks(oldDisplay, newDisplay, 'target');

            // re-push each target object into the global array
            _targets.push($(item).children('i.objectImg')
                .data('obj'));
        });
        createCutDraggables();
    }

    function rule (ele) {
        var retVal = $(ele).data('type');
        if (retVal === 'short' && longForm()) {
            retVal = 'exact';
        }
        return retVal;
    }

    function setLabel (ele) {
        $(ele).hide(); // hide the chevron
        var label = $(ele).parent();
        var newLabel = label.children('input')
                .val();
        label.animate({width: '0px'}, 500, function() {$(this).hide()});
        $(ele).parent()
                .siblings('i.draggableLabel')
                .data('label', newLabel)
                .attr('title', newLabel);
    }

    function setMouseDown(e) {
        var mouse = _canvas.getPointer(e.e);
        _isDrawing = true;
        _startX = mouse.x;
        _startY = mouse.y;

        if (_targetType === 'rect') {
            var obj = new fabric.Rect({
                width: 0,
                height: 0,
                left: _startX,
                top: _startY,
                originX: 'left',
                originY: 'top',
                fill: '#bbbbbb',
                lockRotation: true //Could be turned off if edX supported it!
            });
        } else if (_targetType === 'circle') {
            var obj = new fabric.Circle({
                width: 0,
                height: 0,
                left: _startX,
                top: _startY,
                originX: 'left',
                originY: 'top',
                fill: '#bbbbbb',
                lockRotation: true, //Could be turned off if edX supported it!
                lockUniScaling: true
            });
        } else if (_targetType === 'square') {
            var obj = new fabric.Rect({
                width: 0,
                height: 0,
                left: _startX,
                top: _startY,
                originX: 'left',
                originY: 'top',
                fill: '#bbbbbb',
                lockRotation: true, //Could be turned off if edX supported it!
                lockUniScaling: true
            });
        } else {
            console.log('Unrecognized target type: ' + _targetType);
            return false;
        }
        obj.selectable = true;
        obj.hasControls = true;
        _canvas.add(obj);
        _canvas.renderAll();
        _canvas.setActiveObject(obj);
    }

    function setMouseMove (e) {
        if(!_isDrawing) {
            return false;
        }

        var mouse = _canvas.getPointer(e.e);

        if (mouse.x < 0 || mouse.y < 0) {
            // off the canvas, do nothing
            return false;
        } else {
            var w = mouse.x - _startX,
            h = mouse.y - _startY;

            if (!w || !h) {
                return false;
            }

            var obj = _canvas.getActiveObject();

            if (_targetType === 'rect') {
                obj.set('width', w).set('height', h);
            } else if (_targetType === 'circle') {
                var r = Math.abs(h / 2);
                obj.set('radius', r);
            } else if (_targetType === 'square') {
                obj.set('width', w).set('height', w);
            } else {
                console.log('Unrecognized target type: ' + _targetType);
                return false;
            }
            _canvas.renderAll();
        }
    }

    function setMouseUp (e) {
        if(_isDrawing) {
            _isDrawing = false;
        }
        // create a list of targets and store the active object
        // under each one...delete and link to draggables from here
        if (_targetType === 'rect') {
            var classToAdd = 'fa-square-o';
        } else if (_targetType === 'circle') {
            var classToAdd = 'fa-circle-o';
        } else {
            var classToAdd = 'fa-square-o';
        }
        var obj = _canvas.getActiveObject();
        var targetHtml = currentTarget();
        var targetObj = $(targetHtml);
        targetObj.children('i.objectImg')
                .data('obj', obj)
                .addClass(classToAdd);
        $('#currentTargets').append(targetObj);
        obj.on('selected', function () {
            if (typeof _prevObj !== 'undefined') {
                _prevObj.set('fill', '#bbbbbb');
            }
            this.set('fill', 'red');
            _prevObj = this;
        });
        obj.on('modified', function () {
            createCutDraggables();
        });
        _canvas.on('before:selection:cleared', function (e) {
            e.target.set('fill', '#bbbbbb');
        });
        _canvas.add(obj);
        _canvas.renderAll();
        updateSolutionOptions(getCurrentItemId(targetObj), 'target');

        // for the cutImages data
        _targets.push(obj);
        createCutDraggables();
    }

    function shortDimensions (id) {
        var targets = $('.currentTarget');
        var obj;
        var x, y, w;
        _.each(targets, function (item) {
            if (getCurrentItemId(item) === id) {
                obj = $(item).find('i.objectImg')
                        .data('obj');
            }
        });
        w = Math.floor(obj.currentWidth);
        x = Math.floor(_scale * (obj.left + 0.5 * w));
        y = Math.floor(_scale * (obj.top + 0.5 * w));
        return [[x,y],w];
    }

    function showAnswer () {
        return $('#showAnswer').val();
    }

    function showLabelsInXML () {
        return $('#includeLabelsForIcons').prop('checked');
    }

    function showOutline () {
        return $('#targetOutline').prop('checked');
    }

    function showProblemText () {
        $('#introText').show();
        $('#qText').show();
    }

    function slideOutLabel (ele) {
        var label = $(ele).siblings('span.labelInput');
        label.show()
                .animate({width: '200px'}, 500, function () {
                    label.children('i.hideLabel').show();
                });
        label.children('input')
                .val($(ele).data('label'));
    }

    function stripTrailingComma (value) {
        if (value[value.length - 1] === ',') {
            return value.slice(0,value.length - 1);
        } else {
            return value;
        }
    }

    function targetsPresent () {
        if ($('#currentTargets').children('li').length > 0) {
            return true;
        } else {
            return false;
        }
    }

    function toggleSolutionOptions () {
        $('#solutionsOptions').toggle();
        $('#solutionsOptions').children('span.active')
                .removeClass('active');
        if (!$('#solutionsOptions').is(':visible')) {
            $('#solutionsBtn').removeClass('active');
        }
    }

    function toggleTargetOptions () {
        $('#targetsOptions').toggle();
        $('#targetsOptions').children('span.active')
                .removeClass('active');
        if (!$('#targetsOptions').is(':visible')) {
            $('.upper-canvas').removeClass('crosshairs');
            drawingEvents('remove');
        }
    }

    function updateSolutionOptions (id, type) {
        if (type === 'draggable') {
            var options = $('.solutionDraggable');
        } else if (type === 'target') {
            var options = $('.solutionTarget');
        } else {
            console.log('Error in updateSolutionOptions');
            return false;
        }
        options.append('<option value="' + id + '">' + id + '</option>');
    }

    function updateStatus (message) {
        $('.statusBox').text(message)
                .addClass('red');
        setTimeout(clearStatus, 30000);
    }

    function updateTargetLinks (oldId, newId, type) {
        if (type === 'draggable') {
            var solutions = $('.solutionDraggable');
        } else if (type === 'target') {
            var solutions = $('.solutionTarget');
        } else {
            console.log('Illegal type passed to updateTargetLinks()');
            return false;
        }
        solutions.find('option[value="' + oldId + '"]')
                .val(newId)
                .text(newId);
    }

    function validateSettings () {
        // Easy to forget to set draggables to reusable or to
        // turn on multi-drop for the background.
        // Check the solutions and correct any settings needed.
        var solutionDraggables = $('.solutionDraggable');
        var solutionTargets = $('.solutionTarget');
        var draggableIds = [];
        var targetIds = [];
        var existingIds = [];
        var uncheckMultiDrop = true;
        _.each(solutionDraggables, function (item) {
            draggableIds.push(getCurrentItemId(item));
        });
        _.each(draggableIds, function (id) {
            if (_.indexOf(existingIds, id) >= 0) {
                checkDraggable(id);
            } else {
                existingIds.push(id);
            }
        });
        // Now check if a target is used multiple times,
        // and if so, adjust the draggable setting for multiDrop
        existingIds = [];
        _.each(solutionTargets, function (item) {
            targetIds.push(getCurrentItemId(item));
        });
        _.each(targetIds, function (id) {
            if (_.indexOf(existingIds, id) >= 0) {
                checkMultiDrop(true);
                uncheckMultiDrop = false;
            } else {
                existingIds.push(id);
            }
        });
        if (uncheckMultiDrop) {
            checkMultiDrop(false);
        }
    }

    function weight () {
        return $('#weight').val();
    }

    var DragDropView = Backbone.View.extend({
        el: $('#authoring_wrapper'),
        initialize: function () {
            var compiledTemplate = _.template(DragDropTemplate, {
                                                title: 'Create Drag & Drop Problem'});
            this.$el.html(compiledTemplate);

            if ($('#authoring_wrapper').length > 0) {
                $('body').append(_.template(ButtonsTemplate));
            }

            // ==========
            // BINDINGS
            // ==========
            $('#backgroundFile').on('change', function () {
                var file = this.files[0];
                previewImage(file, 'backgroundImage', function (dimensions) {
                    // Grab these to scale the target zones later
                    _origWidth = dimensions['width'];
                    showProblemText();
                    // Get dimensions of the current image to create right-sized
                    // canvas
                    _canvas = new fabric.Canvas('targetCanvas');
                    _canvas.setHeight(getHeight('backgroundImage'));
                    _canvas.setWidth(getWidth('backgroundImage'));
                    _canvas.renderAll();
                });
                clearStatus();
                clearTargets();
                clearDraggables();
                clearSolutions();
                resetBtns();
            });

            $('#draggableFile').on('change', function () {
                // Make a new item in draggablesPalette
                addDraggable();
            });

            $('.xmlBtn').on('click', function () {
                if (!$(this).hasClass('shiftLeft')) {
//                    var canvasWidth = _canvas.width;
//                    _scale = _origWidth / canvasWidth;
                    _scale = 1;
                    validateSettings();
                    refreshXml();
                }
            });

            $('#draggablesForm').on('click', function (e) {
                if (previewBackgroundPresent()) {
                    clearStatus();
                    closeTargetOptions();
                } else {
                    updateStatus('Select background image before adding draggables.');
                    e.preventDefault();
                }
            });

            this.$el.on('click', '.removeDraggable', function () {
                var _this = $(this);
                cleanUpSolutions(_this);
                _this.parent()
                        .remove();
                removeSolutionOptions(getCurrentItemId(_this));
                reSortDraggableIds();
            });

            this.$el.on('click', '.draggableLabel', function () {
                var _this = $(this);
                slideOutLabel(_this);
            });

            this.$el.on('click', '.hideLabel', function () {
                var _this = $(this);
                setLabel(_this);
            });

            this.$el.on('click', '#targetsBtn', function () {
                if (previewBackgroundPresent()) {
                    var canvasCurrentlyEnabled = $('.upper-canvas').hasClass('crosshairs');
                    clearStatus();
                    disableTargetDrawing();
//                    if ($(this).hasClass('active')) {
                    if (!canvasCurrentlyEnabled) {
                        if (longForm()) {
                            _targetType = 'rect';
                        } else {
                            _targetType = 'circle';
                        }
                        enableTargetDrawing();
                        if (cutDraggables()) {
                            $('.downloadCutImages').show();
                        }
                    }
//                    toggleTargetOptions();
                } else {
                    updateStatus('Select background image before adding targets.');
                    $(this).removeClass('active');
                    e.preventDefault();
                }
            });

            $('input[name="targetTypes"]').on('change', function () {
//                $('.upper-canvas').removeClass('crosshairs');
//                drawingEvents('remove');
//                _targetType = $(this).data('type');
//                $('.upper-canvas').addClass('crosshairs');
//                drawingEvents('bind');
            });

            this.$el.on('click', '.currentTarget', function () {
                var obj = $(this).children('i.objectImg')
                        .data('obj');
                _canvas.setActiveObject(obj);
                _canvas.renderAll();
            });

            this.$el.on('click', '.removeTarget', function () {
                var _this = $(this);
                var obj = _this.siblings('i.objectImg')
                        .data('obj');
                cleanUpSolutions(_this);
                _canvas.remove(obj);
                _canvas.remove(obj);
                _this.parent()
                        .remove();
                removeSolutionOptions(getCurrentItemId(_this));
                reSortTargetIds();
            });

            this.$el.on('click', '#solutionsBtn', function () {
                if (previewBackgroundPresent() && draggablesPresent() && targetsPresent()) {
                    clearStatus();
                    closeTargetOptions();
                    toggleSolutionOptions();
                } else {
                    updateStatus('Select background image, draggables, and targets ' +
                            'before adding solutions.');
                    $(this).removeClass('active');
                    e.preventDefault();
                }
            });

            this.$el.on('click', '.solution-btn', function () {
                var _activeType = $(this).children('input[name="solutionTypes"]')
                        .val();
                addSolution(_activeType);
                toggleSolutionOptions();
            });

            this.$el.on('click', '.addSolutionRow', function () {
                // find the nearest "cloneMe" row
                // clone it
                // reset the inputs
                // append it to after the row
                var _this = $(this);
                cloneSolution(_this);
            });

            this.$el.on('click', '.removeSolutionRow', function () {
                // remove the parent().parent() <span> object
                // check if that is the last one in the <li>
                // if there are no more <span>'s, remove the <li>
                var _this = $(this);
                removeSolution(_this);
            });

            $(document).on('click', '.sideBtn', function () {
//                $(this).toggleClass('shiftLeft');
//                if ($(this).hasClass('shiftLeft')) {
//                    $(this).animate({'right':'375px'}, 200);
//                } else {
//                    $(this).animate({'right': '-25px'}, 200);
//                }
            });

            this.$el.on('focus', '[contenteditable]', function() {
            // Regex from : http://stackoverflow.com/questions/2513848/how-to-remove-nbsp-and-br-using-javascript-or-jquery
                var $this = $(this);
                $this.data('before', getCurrentItemId($this));
                return $this;
            }).on('blur', '[contenteditable]', function() {
                var _this = $(this);
                var newId = getCurrentItemId(_this);
                if (newId === '') {
                    _this.text('ID: ' + _this.data('before'));
                } else {
                    if (_this.data('before') !== newId) {
                        if (_this.parent().hasClass('currentDraggable')) {
                            updateTargetLinks(_this.data('before'), newId, 'draggable');
                        } else if (_this.parent().hasClass('currentTarget')) {
                            updateTargetLinks(_this.data('before'), newId, 'target');
                        }
                    }
                }
            });

            // If a draggable is dropped onto the canvas, load the
            // draggable icon into a canvas object.
            $('#backgroundImage').droppable({
                drop: function (event, ui) {
                    var $d = ui.draggable,
                        _left = event.offsetX,
                        _top = event.offsetY,
                        img = new fabric.Image($d[0], {
                            left    : _left,
                            top     : _top
                        });
                    _canvas.add(img);
                    $d.draggable('disable');
                    _images.push(img);
                    $('.downloadDraggableIcons').show();
                    disableTargetDrawing();
                    $('#targetsBtn').removeClass('active');
                }
            });

            $('.downloadDraggableIcons').on('click', function () {
                if (!$(this).hasClass('shiftLeft')) {
                    grabNewDraggableImages();
                }
            });

            // Do allow someone to cut an image out of a background, and use the
            // image as a draggable:
            $('.downloadCutImages').on('click', function () {
                disableTargetDrawing();
                if (!$(this).hasClass('shiftLeft')) {
                    grabCutImages();
                }
            });

            // ========
            // END BINDINGS
            // ========

            // ========
            // INIT UI WIDGETS
            // ========
            $('.xmlBtn').show();

            $('.xmlBtn').sidr({
                name: 'xml-right',
                side: 'right'
            });

            $('#dragDropAccordion').accordion({
                autoHeight: false
            }); // using jquery 1.8.21...for 1.9+, would have to use heightStyle: 'content'

            $('#startDate').datepicker();
            $('#dueDate').datepicker();

            // From: http://jsfiddle.net/skimberk1/TUPG7/
            $('#longOrShort').find('.slider-button')
                .toggle(function(){
                $(this).addClass('on')
                        .html('Long Form');
                $('#longForm').prop('checked', true);
            },function(){
                $(this).removeClass('on')
                        .html('Short Form');
                $('#longForm').prop('checked', false);
            });

            // For the option to upload draggables or cut them out
            $('#addDraggablesOrCut').find('.slider-button')
                .toggle(function(){
                $(this).addClass('on')
                        .html('Cut draggables');
                $('#cutDraggables').prop('checked', true);
                    // disable the "add draggables" button
                $('#draggablesFileBtn').hide();
            },function(){
                $(this).removeClass('on')
                        .html('Upload Draggables');
                $('#cutDraggables').prop('checked', false);
                    // endable the "add draggables" button
                $('#draggablesFileBtn').show();
            });

            $('#currentDraggables').sortable({
                handle: 'span.dragHandle'
            });

            $('.downloadDraggableIcons').sidr({
                name: 'downloadDraggables-right',
                side: 'right'
            });

            $('.downloadCutImages').sidr({
                name: 'downloadCutImages-right',
                side: 'right'
            });

            // ========
            // END INIT
            // ========
            return this;
        }
    });

    new DragDropView();

    return DragDropView;
});
