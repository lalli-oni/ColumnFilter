var Column = function Column(name) {
	this.Name = name;
	this.Filters = [];
	this.Values = [];
	this.DataType;

	// Returns the regex filter object based on the value name, removes any regex characters
	this.removeRegexOnValue = function(value) {
		// Escape for regex
		value = value.toLowerCase();
		value = value.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\\\$&");
		value = "^" + value;
		for (var fIndex = 0; fIndex < this.Filters.length; fIndex++) {
			var comparedRegex = new RegExp(value);
			var currentRegexPattern = this.Filters[fIndex].toString();
			currentRegexPattern = currentRegexPattern.substr(5);
			if (comparedRegex.test(currentRegexPattern)) {
				this.Filters.splice(fIndex--, 1);
				return;
			}
		}
		if(this.Filters.length === 0) {
			$('th.searchable[data-property-name="' + this.Name + '"]').removeClass('filteredColumn');
		}
	}

	this.removeInverseRegexes = function() {
		for (var fIndex = 0; fIndex < this.Filters.length; fIndex++) {
			if (this.Filters[fIndex].Inverse === true) {
				this.Filters.splice(fIndex--, 1);
			}
		}
		if(this.Filters.length === 0) {
			$('th.searchable[data-property-name="' + this.Name + '"]').removeClass('filteredColumn');
		}
	}

	this.resetFilters = function() {
		this.Filters = [];
		$('th.searchable[data-property-name="' + this.Name + '"]').removeClass('filteredColumn');
	}
}

var ColumnFilter = {
	columns: [] // Holds columns classified as being filterable
	
	,getColumnOnName: function(name) {
		for (var cIndex = 0; cIndex < ColumnFilter.columns.length; cIndex++) {
			if (ColumnFilter.columns[cIndex].Name === name) {
				return ColumnFilter.columns[cIndex];
			}
		}
		return null;
	}
	,resetAllFilters: function() {
		for (var cIndex = 0; cIndex < ColumnFilter.columns.length; cIndex++) {
			ColumnFilter.columns[cIndex].resetFilters();
		}
	}

	,indexOfWithProperty: function(array, attr, value) {
		for(var i = 0; i < array.length; i += 1) {
			if(array[i][attr] === value) {
				return i;
			}
		}
		return -1;
	}

	,getRegexIndex: function(column, regex) {
		for (var fIndex = 0; fIndex < column.Filters.length; fIndex++) {
			if (column.Filters[fIndex].toString() === regex.toString()) {
				return fIndex;
			}
		}
		return -1;
	}
	
	,removeSortingListeners: function() {
		$('th.sorting').find('*').off('keypress');
		$('th.sorting').find('*').unbind('keypress');
	}

	,createRegexpFromString: function(patternText, inverse) {
		if (inverse === undefined) {
			inverse = false;
		}
		patternText = patternText.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
		var regex = new RegExp('.*^(' + patternText.toLowerCase() + ').*', 'i');
		regex.Inverse = inverse;
		return regex;
	}

	,createTextFilter: function(column, container) {

		// Create the text filter
		$('<input />', {
			class: 'columnFilter textFilter',
			type: 'text',
			// i: 'cb'+i,
			'data-column-name': column.Name
			,keyup: function(e) {
				var column = ColumnFilter.getColumnOnName($(this).data('columnName'));
				if (e.keyCode == 13) { // Only apply search on Enter
					e.preventDefault(); // Block other event handlers
					var columnIndex = ColumnFilter.indexOfWithProperty(ColumnFilter.columns, "Name", $(this).data('columnName'));
					var value = $(this).val();
					var filterIndex = ColumnFilter.getRegexIndex(ColumnFilter.columns[columnIndex], ColumnFilter.createRegexpFromString(value, true));
					// Removes all inverse regexes from this column
					ColumnFilter.columns[columnIndex].removeInverseRegexes();
					if (filterIndex === -1 && value.length > 0) {
						ColumnFilter.columns[columnIndex].Filters.push(ColumnFilter.createRegexpFromString(value, true));
					}
					if(column.Filters.length > 0) {
						$('th.searchable[data-property-name="' + column.Name + '"]').addClass('filteredColumn');
					}
					else {
						$('th.searchable[data-property-name="' + column.Name + '"]').removeClass('filteredColumn');
					}
					$(this).focusout();
					table.draw();
				}
			}
		}).appendTo(container);
	}

	,extendSearchFunctions: function() {
		$.fn.dataTable.ext.search.push(
			function(settings, data, dataIndex, row) {
				for (var cIndex = 0; cIndex < ColumnFilter.columns.length; cIndex++) {
					if (ColumnFilter.columns[cIndex].DataType === 'string') {
						//  console.log('Filtering Row: ' + row + ' .Column: ' + cIndex);
						for (var fIndex = 0; fIndex < ColumnFilter.columns[cIndex].Filters.length; fIndex++) {
							var filter = ColumnFilter.columns[cIndex].Filters[fIndex];

							// First filter on 'blanks' / undefined
							if (filter === '(Blanks)' && row[ColumnFilter.columns[cIndex].Name] === undefined) {
								return false;
							}

							// Bypasses rest of comparisons if either value or current filter is blank
							if (row[ColumnFilter.columns[cIndex].Name] === undefined || filter === undefined) {
								continue; 
							}

							// Then checkbox value filters
							if (filter.Inverse === false && filter.test(row[ColumnFilter.columns[cIndex].Name])) {
								return false;
							}
							// Then textbox filters
							if (filter.Inverse === true && !filter.test(row[ColumnFilter.columns[cIndex].Name])) {
								return false;
							}
						}
					}
					else if (ColumnFilter.columns[cIndex].DataType === 'number'){
						for (var fIndex = 0; fIndex < ColumnFilter.columns[cIndex].Filters.length; fIndex++) {
							if (ColumnFilter.columns[cIndex].Filters[fIndex] === row[ColumnFilter.columns[cIndex].Name]) {
								return false;
							}
						}
					}
				}
				return true;
			});
	}

	// Creates the column filters on all columns including 'searchable' class
	,populateColumnFilters: function(results){
		// Creates a linq like enumberable object from results
		// Library: https://archive.codeplex.com/?p=linqjs
		var enumeratedResults = Enumerable.from(results);
		
		var clearFiltersButton = $('<button />', {
			class: 'clearFilters'
			,text: 'Clear filters'
			,click: function (e) {
				e.preventDefault();
				$('.columnFilter.valueFilter').prop('checked', true);
				$('.columnFilter.undefinedFilter').prop('checked', true);
				$('.columnFilter.textFilter').val('');
				ColumnFilter.resetAllFilters();
				table.search(''); // Clears the global filter
				table.draw();
			}
		}).appendTo($('#resultTable_wrapper > .top'));

		var searchSpinnerDiv = $('<div id="searchingSpinner">Searching...</div>').insertBefore('#resultTable');
		searchSpinnerDiv.hide();

		// Iterate on all of the searchable columns
		$('.searchable').each(function(index) {
			var column = new Column($(this).data('propertyName'));
			column.Values = enumeratedResults.select(function(i) { return i[column.Name]; })
												.distinct()
												.orderBy(function(s) { return s; });
			var dataTypeCount = enumeratedResults.select(function(i) { return typeof i[column.Name]; })
													.distinct()
													.count();
			var undefinedLines = enumeratedResults.where(function(i) { return typeof i[column.Name] === 'undefined'})
													.count();
			if (undefinedLines > 0) {
				// Finds the first non undefined value
				var dataTypeIndex = results.length - 1;
				while (typeof results[dataTypeIndex][column.Name] === 'undefined') {
					if (dataTypeIndex === -1) {
						console.log('[ColumnFilter] Error: could not find a value in column ' + column.Name);
						return;
					}
					dataTypeIndex--;
				}
				column.DataType = typeof results[dataTypeIndex][column.Name];
			}
			else if (dataTypeCount !== 1) {
				console.log('Column \'' + column.Name + '\' has ' + dataTypeCount + ' different data types. Multiple data type filtering unsupported.');
			}
			else {
				column.DataType = typeof results[0][column.Name];
			}

			// $(this).append('<br />');
			var showFilterButton = $('<button />', {
				class: 'columnFilterToggle'
				,'data-column-name': column.Name
				,text: '+'
				,click: function (e) {
					e.preventDefault();
					$('.columnFilterContainer').hide();
					if ($(this).text() === '+') {
						$('.columnFilterContainer[data-column-name=' + column.Name + ']').show();
						$(this).text('-');
						$('input.columnFilter.textFilter[data-column-name=' + column.Name + ']').focus();
					}
					else {
						$(this).text('+');
					}
				}
			}).appendTo($(this));
			
			// Creates the filter container element we will populate the filter checkboxes inside of
			var filterContainer = $('<div />', {
				class: 'columnFilterContainer'
				,tabindex: 0
				,id: 'filter' + column.Name
				,'data-column-name': column.Name
				// DEVNOTE: halting implementation, selecting descendant elements loses focus on this div
				// ,focusout: function(e) {
				// 	$(this).hide();
				// 	$('.columnFilterToggle[data-column-name=\'' + $(this).data('columnName') + '\']').text('+');
				// }
			}).appendTo($(this));
			filterContainer.hide();
			
			$(filterContainer).append('<span>Filter on ' + column.Name + '</span> <br />');
			if (column.DataType === 'string') {
				ColumnFilter.createTextFilter(column, filterContainer);
			}

			// Seperator between text field and value checkboxes
			$(filterContainer).append('<hr>');
			$('<input />', {
				class: 'checkAllBox'
				,type: 'checkbox'
				,checked: true
				,id: 'checkAll' + column.Name + 'Box'
				,'data-column-name': column.Name
				,change: function() {
					var testOperationStart = new Date();
					var columnName = $(this).data('columnName');
					var column = ColumnFilter.getColumnOnName(columnName);
					if ($(this).is(':checked')) {
						// Checking all
						// DEVNOTE: check only ones that were not checked
						$('.columnFilter.valueFilter[data-column-name=' + columnName + ']').prop('checked', true);
						$('.columnFilter.undefinedFilter[data-column-name=' + columnName + ']').prop('checked', true);
						var inverseFilters = [];
						for (var fIndex = 0; fIndex < column.Filters.length; fIndex++) {
							if (column.Filters[fIndex] && column.Filters[fIndex].Inverse) {
								inverseFilters.push(column.Filters[fIndex]);
							}
						}
						column.Filters = inverseFilters;
						if(column.Filters.length === 0) {
							$('th.searchable[data-property-name="' + column.Name + '"]').removeClass('filteredColumn');
						}
						table.draw();
					}
					else {
						// Unchecking all
						$('#searchingSpinner').show();
						$('.columnFilter.valueFilter:checked[data-column-name=' + columnName + ']').prop('checked', false);
						$('.columnFilter.undefinedFilter[data-column-name=' + columnName + ']').prop('checked', false);
						var filters = [];
						// Create temporary array for inverse filters
						for (var fIndex = 0; fIndex < column.Filters.length; fIndex++) {
							if (column.Filters[fIndex] && column.Filters[fIndex].Inverse) {
								filters.push(column.Filters[fIndex]);
							}
						}
						column.Filters = filters;
						column.Values.forEach(function(v){
							if (v === undefined) {
								column.Filters.push('(Blanks)');
							}
							else if (column.DataType === 'string') {
								column.Filters.push(ColumnFilter.createRegexpFromString(v));
							}
							else {
								column.Filters.push(v);
							}
						});
						
						$('th.searchable[data-property-name="' + column.Name + '"]').addClass('filteredColumn');
						table.draw();
						$('#searchingSpinner').hide();
					}
					var testOperationend = new Date();
					var timeDiff = Math.abs(testOperationStart.getTime() - testOperationend.getTime());
					// console.log('Finished check/uncheck all. Duration: ' + (timeDiff / 1000) + 'sec.' );
				}
			}).appendTo(filterContainer);
			// Making the corresponding label
			$(filterContainer).append('<label class="checkAllLabel" for=checkAll' + column.Name + 'Box>(Check all)</label> <br />');

			if (undefinedLines > 0) {
				$('<input />', {
					class: 'columnFilter undefinedFilter',
					type: 'checkbox',
					checked: true,
					id: column.Name + "Val" + index,
					'data-column-name': column.Name
					,value: '(Blanks)'
					,change: function() {
						var columnIndex = ColumnFilter.indexOfWithProperty(ColumnFilter.columns, "Name", $(this).data('columnName'));
						if ($(this).is(':checked')) {
							ColumnFilter.columns[columnIndex].Filters.splice(ColumnFilter.columns[columnIndex].Filters.indexOf('(Blanks)'), 1);
							if(column.Filters.length === 0) {
								$('th.searchable[data-property-name="' + column.Name + '"]').removeClass('filteredColumn');
							}
						}
						else {
							ColumnFilter.columns[columnIndex].Filters.push('(Blanks)');
							$('th.searchable[data-property-name="' + column.Name + '"]').addClass('filteredColumn');
						}
						table.draw();
					}
				}).appendTo(filterContainer);
				// Making the corresponding label
				$(filterContainer).append('<label class="blankLabel" for=' + column.Name + '"Blank">(Blanks)</label>');
				$(filterContainer).append('<br />');
			}
			// Create value checkbox filters
			var index = 0;
			column.Values.forEach(function(value) {
				if (value !== undefined) {
					$('<input />', {
						class: 'columnFilter valueFilter',
						type: 'checkbox',
						checked: true,
						id: column.Name + "Val" + index,
						'data-column-name': column.Name
						,value: value
						,change: function() {
							var columnIndex = ColumnFilter.indexOfWithProperty(ColumnFilter.columns, "Name", $(this).data('columnName'));
							if (!$(this).is(':checked')) {
								if (column.DataType === 'string') {
									ColumnFilter.columns[columnIndex].Filters.push(ColumnFilter.createRegexpFromString(value));
								}
								else {
									column.Filters.push(value);
								}
								$('th.searchable[data-property-name="' + column.Name + '"]').addClass('filteredColumn');
								$(this).prop('checked', false);
							}
							else {
								if (column.DataType === 'string') {
									ColumnFilter.columns[columnIndex].removeRegexOnValue(value);
								}
								else {
									column.Filters.splice(column.Filters.indexOf(value), 1);
								}
								if (column.Filters.length === 0) {
									$('th.searchable[data-property-name="' + column.Name + '"]').removeClass('filteredColumn');
								}
								
								$(this).prop('checked', true);
							}
							table.draw();
						}
					}).appendTo(filterContainer);
					// Making the corresponding label
					$(filterContainer).append('<label class="valueLabel" for=' + column.Name + "Val" + index++ + '>' + value + '</label>');
					$(filterContainer).append('<br />');
				}
			}, this);
			filterContainer.appendTo($(this));
			
			ColumnFilter.columns.push(column);

			ColumnFilter.removeSortingListeners();
			ColumnFilter.extendSearchFunctions();
		});
	}
}