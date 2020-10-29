function createCombinationsBehavior(settings) {
  var defaultSettings = {
    contentEl: false,
    fetchUrl: false
  };

  return {
    settings: $.extend({}, defaultSettings, settings),
    params: {
      availableCombinations: [],
      availableAttributeIds: []
    },

    init: function () {
      var $contentEl = $(this.settings.contentEl);
      var $attributes = $('[data-attr]', $contentEl);
      if ($attributes && $attributes.length > 0) {
        var self = this;

        $.each($attributes, function (index, attribute) {
          var id = parseInt($(attribute).data('attr'));
          self.params.availableAttributeIds.push(id);
        });

        $attributes.on('change', function () {
          self.processCombinations();
        });
      }

      this.loadCombinations();
    },

    loadCombinations: function () {
      var self = this;

      $.ajax({
        cache: false,
        url: self.settings.fetchUrl,
        type: 'GET',
        success: function (response) {
          self.params.availableCombinations = response;

          var selectedAttributes = self.getSelectedAttributes();
          if (selectedAttributes && selectedAttributes.length > 0) {
            self.processCombinations();
          }
        },
        error: function () {
          self.params.availableCombinations = [];
        }
      });
    },

    processCombinations: function () {
      var self = this;

      var availableCombinations = this.params.availableCombinations;
      if (!availableCombinations || availableCombinations.length === 0) {
        // disable/hide all attribute values
        var valueIds = this.getAttributeValueIds();
        $.each(valueIds, function (index, valueId) {
          self.toggleAttributeValue(valueId, false);
        });

        return;
      }

      var selectedAttributes = self.getSelectedAttributes();
      if (selectedAttributes && selectedAttributes.length > 0) {
        var processedAttributes = [];

        $.each(selectedAttributes, function (index, selectedAttribute) {
          var combinations = self.getCombinationsByAttributeId(selectedAttribute.id, processedAttributes);
          if (combinations && combinations.length > 0) {
            var processedValues = [];

            $.each(combinations, function (index, combination) {
              var attribute = $.grep(combination.Attributes, function (attribute) {
                return attribute.Id === selectedAttribute.id;
              })[0];

              $.each(attribute.ValueIds, function (index, valueId) {
                var processedValue = $.grep(processedValues, function (value) {
                  return value.id === valueId;
                })[0];
                
                if (processedValue) {
                  if (!processedValue.inStock && combination.InStock) {
                    self.toggleAttributeValue(valueId, true);
                    processedValue.inStock = true;
                  }
                } else {
                  self.toggleAttributeValue(valueId, combination.InStock);
                  processedValues.push({ id: valueId, inStock: combination.InStock });
                }
              });
            });

            // toggle unprocessed attribute value
            var valueIds = self.getAttributeValueIds(selectedAttribute.id);
            $.each(valueIds, function (index, valueId) {
              var processedValue = $.grep(processedValues, function (value) {
                return value.id === valueId;
              })[0];
              if (!processedValue) {
                self.toggleAttributeValue(valueId, false);
              }
            });
          } else {
            // toggle all attribute values
            valueIds = self.getAttributeValueIds(selectedAttribute.id);
            $.each(valueIds, function (index, valueId) {
              self.toggleAttributeValue(valueId, false);
            });
          }

          processedAttributes.push(selectedAttribute);
        });
      }
    },

    getCombinationsByAttributeId: function (attributeId, processedAttributes) {
      var availableCombinations = this.params.availableCombinations;
      if (!availableCombinations || availableCombinations.length === 0) {
        return;
      };

      return $.grep(availableCombinations, function (combination) {
        var found = $.grep(combination.Attributes, function (attribute) {
          return attribute.Id === attributeId;
        })[0];

        if (processedAttributes && processedAttributes.length > 0) {
          $.each(processedAttributes, function (index, processedAttribute) {
            found = found && $.grep(combination.Attributes, function (attribute) {
              var attrbiuteIsFound = attribute.Id === processedAttribute.id;

              // exclude unselected attribute values
              if (processedAttribute.values.length > 0) {
                $.each(processedAttribute.values, function (index, id) {
                  attrbiuteIsFound = attrbiuteIsFound && $.inArray(id, attribute.ValueIds) !== -1
                });
              }

              return attrbiuteIsFound;
            })[0];
          });
        }

        return found;
      });
    },

    getAttributeValueIds: function (attributeId) {
      var $contentEl = $(this.settings.contentEl);
      var $scope = attributeId ? $('[data-attr=' + attributeId + ']', $contentEl) : $contentEl;
      var $valueItems = $('[data-attr-value]', $scope);
      if ($valueItems) {
        return $.map($valueItems, function (item) {
          return parseInt($(item).data('attr-value'));
        });
      }
    },

    toggleAttributeValue: function (valueId, enabled) {
      if (!valueId)
        return;

      var $contentEl = $(this.settings.contentEl);
      var $value = $('[data-attr-value=' + valueId + ']', $contentEl);
      if (enabled) {
        $value.prop('disabled', false);
        $('input', $value).prop('disabled', false);
        $value.removeClass('disabled');
      } else {
        $value.prop('disabled', true);
        $('input', $value).prop('disabled', true);
        $value.addClass('disabled');
      }
    },

    getSelectedAttributes: function () {
      var availableAttributeIds = this.params.availableAttributeIds;
      if (availableAttributeIds && availableAttributeIds.length > 0) {
        var $contentEl = $(this.settings.contentEl);

        return $.map(availableAttributeIds, function (attributeId) {
          var selectedValues = [];

          var $attribute = $('[data-attr=' + attributeId + ']', $contentEl);
          var $attributeValues = $('[data-attr-value]', $attribute);
          if ($attributeValues && $attributeValues.length > 0) {
            $.each($attributeValues, function (index, value) {
              var $value = $(value);
              if ($value.is(':selected') || $('input', $value).is(':checked')) {
                var id = parseInt($value.data('attr-value'));
                selectedValues.push(id);
              }
            });
          }

          return {
            id: attributeId,
            values: selectedValues
          }
        });
      }
    },
  }
}