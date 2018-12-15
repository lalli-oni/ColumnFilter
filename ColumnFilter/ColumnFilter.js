/**
 * Constructor for a Column object
 * @param {string} name Name of column/field
 */
var Column = function Column(name) {
	this.Name = name;
	// Currently active filters
	this.Filters = [];
	// Holds the distinct values of the field
	// DEV-NOTE: This can be a lot of data. Consider indexing this
	this.Values = [];
	// The data type of the field
	// Supported: String, Integer and partial support for Date
	this.DataType;

	/**
	 * Removes the filter based on its Regex filter value
	 * @param {string} value Regex value to remove filter on
	 */
	this.removeRegexOnValue = function(value) {
		// Set all regex filtering to lower case. Only support case agnostic filtering
		value = value.toLowerCase();
		// Escape Regex reserved characters
		value = value.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\\\$&");
		// Create the RegExp object to compare with others
		// DEV-NOTE: Rather wasteful, we can get rid of this for performance improvements
		let comparedRegex = new RegExp(value);
		// Iterate on filters
		for (let fIndex = 0; fIndex < this.Filters.length; fIndex++) {
			// Holds the current filter element as text
			let currentRegexPattern = this.Filters[fIndex].toString();
			// Compares the patterns
			if (comparedRegex.test(currentRegexPattern)) {
				// Removes the filter
				this.Filters.splice(fIndex, 1);
				// Exits function, work on the assumption that filters are unique
				return;
			}
		}
		// If there are no filters we want to make sure that the column styling doesn't indicate it is filtered
		if(this.Filters.length === 0) {
			$('th.searchable[data-property-name="' + this.Name + '"]').removeClass('filteredColumn');
		}
	}

	/**
	 * Removes any Inverse regex from the filters
	 */
	this.removeInverseRegexes = function() {
		for (var fIndex = 0; fIndex < this.Filters.length; fIndex++) {
			if (this.Filters[fIndex].Inverse === true) {
				this.Filters.splice(fIndex--, 1);
			}
		}
		// If there are no filters we want to make sure that the column styling doesn't indicate it is filtered
		if(this.Filters.length === 0) {
			$('th.searchable[data-property-name="' + this.Name + '"]').removeClass('filteredColumn');
		}
	}

	/**
	 * Clears the active filters
	 */
	this.clearFilters = function() {
		this.Filters = [];
		$('th.searchable[data-property-name="' + this.Name + '"]').removeClass('filteredColumn');
	}
}

/**
 * ColumnFilter Module namespace
 */
var ColumnFilter = {
	table: null
	,columns: [] // Holds columns classified as being filterable
	
	/**
	 * Gets column based on name
	 * @argument {string} name Name of column
	 * @return {Column} The column
	 */
	,getColumnOnName: function(name) {
		for (var cIndex = 0; cIndex < ColumnFilter.columns.length; cIndex++) {
			if (ColumnFilter.columns[cIndex].Name === name) {
				return ColumnFilter.columns[cIndex];
			}
		}
		return null;
	}
	/**
	 * Clears all filters for all columns
	 */
	,clearAllFilters: function() {
		for (var cIndex = 0; cIndex < ColumnFilter.columns.length; cIndex++) {
			ColumnFilter.columns[cIndex].clearFilters();
		}
	}

	/**
	 * Gets the first index of an element in an array based on one of it's properties
	 * Returns -1 if no element matches the criteria
	 * @argument {Array} array The array
	 * @argument {string} prop Name of the property
	 * @argument {object} value The value to search on
	 * @return {int} The index of the first element that matches
	 */
	,indexOfWithProperty: function(array, prop, value) {
		for(var i = 0; i < array.length; i += 1) {
			if(array[i][prop] === value) {
				return i;
			}
		}
		return -1;
	}

	/**
	 * Gets the index of the Regular Expression object in the column
	 * @argument {Column} column The column to search in
	 * @argument {RegExp} regex The regular expression to match
	 * @return {int} The index of the first RegExp that matches
	 */
	,getRegexIndex: function(column, regex) {
		for (var fIndex = 0; fIndex < column.Filters.length; fIndex++) {
			if (column.Filters[fIndex].toString() === regex.toString()) {
				return fIndex;
			}
		}
		return -1;
	}
	
	/**
	 * Removes the sorting listeners from the DataTable
	 */
	,removeSortingListeners: function() {
		$('th.sorting').find('*').off('keypress');
		$('th.sorting').find('*').unbind('keypress');
	}

	/**
	 * Creates a RegExp based on the filter text provided by user
	 * @argument {string} patternText The text to filter on
	 * @argument {bool} inverse Whether the Regular Expression match should be inverted
	 */
	,createRegexpFromString: function(patternText, inverse) {
		// Optional argument definition
		if (inverse === undefined) { inverse = false; }
		// Escape regular expression reserved characters
		patternText = patternText.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
		// Creates the Regular expression. Matches on any substring
		let regex = new RegExp('.*(' + patternText.toLowerCase() + ').*', 'i');
		regex.Inverse = inverse;
		return regex;
	}

	/**
	 * Extends the search function of the DataTable
	 */
	,extendSearchFunctions: function() {
		// Pushes the anonymous filtering function on the search function array
		// DEV-NOTE: Needs to support missing and multiple tables
		$.fn.dataTable.ext.search.push(
			function(settings, data, dataIndex, row) {
				// Iterate on columns
				for (let cIndex = 0; cIndex < ColumnFilter.columns.length; cIndex++) {
					// Resolve data type of the current column
					if (ColumnFilter.columns[cIndex].DataType === 'string') {
						// Iterate on filters
						for (let fIndex = 0; fIndex < ColumnFilter.columns[cIndex].Filters.length; fIndex++) {
							let filter = ColumnFilter.columns[cIndex].Filters[fIndex];

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
						// Iterate on filters
						for (var fIndex = 0; fIndex < ColumnFilter.columns[cIndex].Filters.length; fIndex++) {
							// DEV-NOTE: Hold on a second... compare value to name? o_O
							// DEV-NOTE: Needs more comparison operators (greater than, greater or equal than...)
							if (ColumnFilter.columns[cIndex].Filters[fIndex] === row[ColumnFilter.columns[cIndex].Name]) {
								return false;
							}
						}
					}
				}
				return true;
			});
	}
	
	/**
	 * Creates a text filter field for user to write in
	 * @argument {Column} column The column to create the text filter for
	 * @argument {DOM element} container The container for this text filter
	 */
	,createTextFilter: function(column, container) {
		// Create the text filter
		$('<input />', {
			class: 'columnFilter textFilter',
			type: 'text',
			'data-column-name': column.Name
			,keyup: function(e) {
				// Gets the associated column
				let column = ColumnFilter.getColumnOnName($(this).data('columnName'));
				if (e.keyCode == 13) { // Only apply search on Enter
					// Block other event handlers
					// DEV-NOTE: This was introduced due to Sharepoint event handler on Enter submitted form and reloaded page
					e.preventDefault();

					let columnIndex = ColumnFilter.indexOfWithProperty(ColumnFilter.columns, "Name", $(this).data('columnName'));
					let value = $(this).val();
					let filterIndex = ColumnFilter.getRegexIndex(ColumnFilter.columns[columnIndex], ColumnFilter.createRegexpFromString(value, true));
					// Removes all inverse regexes from this column
					ColumnFilter.columns[columnIndex].removeInverseRegexes();
					// If filter doesn't already exist and there is some value being filtered, add it as an inverse filter.
					// Inverse filter: filters everything out that doesn't match the regular expression
					if (filterIndex === -1 && value.length > 0) {
						ColumnFilter.columns[columnIndex].Filters.push(ColumnFilter.createRegexpFromString(value, true));
					}

					// Apply the 'Is filtered?' styling to the column header
					if(column.Filters.length > 0) {
						$('th.searchable[data-property-name="' + column.Name + '"]').addClass('filteredColumn');
					}
					else {
						$('th.searchable[data-property-name="' + column.Name + '"]').removeClass('filteredColumn');
					}
					$(this).focusout(); // Removes focus on the text field
					ColumnFilter.table.draw();
				}
			}
		}).appendTo(container);
	}

	// Creates the column filters on all columns including 'searchable' class
	,populateColumnFilters: function(table, results){
		this.table = table;
		// Creates a linq like enumberable object from results
		// Library: https://archive.codeplex.com/?p=linqjs
		let enumeratedResults = Enumerable.from(results);
		
		// Appends clear all filters button to top of table
		let clearFiltersButton = $('<button />', {
			class: 'clearFilters'
			,text: 'Clear filters'
			,click: function (e) {
				// Prevents other default event handler
				// DEV-NOTE: Need clarification why this was needed
				e.preventDefault();
				$('.columnFilter.valueFilter').prop('checked', true);
				$('.columnFilter.undefinedFilter').prop('checked', true);
				$('.columnFilter.textFilter').val('');
				ColumnFilter.clearAllFilters();
				table.search(''); // Clears the global filter
				ColumnFilter.table.draw();
			}
		}).appendTo($('#resultTable_wrapper > .top'));

		// DEV-NOTE: Have been unsuccesful making it appear. Leaving it in for reference.
		// let searchSpinnerDiv = $('<div id="searchingSpinner">Searching...</div>').insertBefore('#resultTable');
		// searchSpinnerDiv.hide();

		// Iterate on all of the searchable columns
		$('.searchable').each(function() {
			let column = new Column($(this).data('propertyName'));
			column.Values = enumeratedResults.select(function(i) { return i[column.Name]; })
												.distinct()
												.orderBy(function(s) { return s; });
			let dataTypeCount = enumeratedResults.select(function(i) { return typeof i[column.Name]; })
													.distinct()
													.count();
			let undefinedLines = enumeratedResults.where(function(i) { return typeof i[column.Name] === 'undefined'})
													.count();
			
			// If any line has undefined data type
			if (undefinedLines > 0) {
				// Finds the first non undefined value
				let dataTypeIndex = results.length - 1;
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
				console.log('[ColumnFilter] Error: Column \'' + column.Name + '\' has ' + dataTypeCount + ' different data types. Filtering on multiple data types is unsupported.');
			}
			else {
				column.DataType = typeof results[0][column.Name];
			}

			// Creates the show filters button
			let showFilterButton = $('<button />', {
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
					// DEV-NOTE: Leaving this in for now to do basic benchmarking
					// let testOperationStart = new Date();
					let columnName = $(this).data('columnName');
					let column = ColumnFilter.getColumnOnName(columnName);
					if ($(this).is(':checked')) {
						// Checking all
						$('.columnFilter.valueFilter[data-column-name=' + columnName + ']').prop('checked', true);
						$('.columnFilter.undefinedFilter[data-column-name=' + columnName + ']').prop('checked', true);
						// Holds inverse filters while we remove the rest
						let inverseFilters = [];
						for (let fIndex = 0; fIndex < column.Filters.length; fIndex++) {
							if (column.Filters[fIndex] && column.Filters[fIndex].Inverse) {
								inverseFilters.push(column.Filters[fIndex]);
							}
						}
						column.Filters = inverseFilters;
						if(column.Filters.length === 0) {
							$('th.searchable[data-property-name="' + column.Name + '"]').removeClass('filteredColumn');
						}
						ColumnFilter.table.draw();
					}
					else {
						// Unchecking all
						$('#searchingSpinner').show();
						$('.columnFilter.valueFilter:checked[data-column-name=' + columnName + ']').prop('checked', false);
						$('.columnFilter.undefinedFilter[data-column-name=' + columnName + ']').prop('checked', false);
						let filters = [];
						// Create temporary array for inverse filters
						for (let fIndex = 0; fIndex < column.Filters.length; fIndex++) {
							if (column.Filters[fIndex] && column.Filters[fIndex].Inverse) {
								filters.push(column.Filters[fIndex]);
							}
						}
						column.Filters = filters;
						column.Values.forEach(function(value){
							if (value === undefined) {
								column.Filters.push('(Blanks)');
							}
							else if (column.DataType === 'string') {
								column.Filters.push(ColumnFilter.createRegexpFromString(value));
							}
							else {
								column.Filters.push(value);
							}
						});
						
						$('th.searchable[data-property-name="' + column.Name + '"]').addClass('filteredColumn');
						ColumnFilter.table.draw();
						$('#searchingSpinner').hide();
					}
					// DEV-NOTE: Leaving this in for now to do basic benchmarking
					// var testOperationend = new Date();
					// let timeDiff = Math.abs(testOperationStart.getTime() - testOperationend.getTime());
					// console.log('Finished check/uncheck all. Duration: ' + (timeDiff / 1000) + 'sec.' );
				}
			}).appendTo(filterContainer);
			// Making the corresponding label
			$(filterContainer).append('<label class="checkAllLabel" for=checkAll' + column.Name + 'Box>(Check all)</label> <br />');

			// If any undefined lines we create a "blank" filter
			if (undefinedLines > 0) {
				$('<input />', {
					class: 'columnFilter undefinedFilter',
					type: 'checkbox',
					checked: true,
					id: column.Name + "Val" + index,
					'data-column-name': column.Name
					,value: '(Blanks)'
					,change: function() {
						let columnIndex = ColumnFilter.indexOfWithProperty(ColumnFilter.columns, "Name", $(this).data('columnName'));
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
						ColumnFilter.table.draw();
					}
				}).appendTo(filterContainer);
				// Making the corresponding label
				$(filterContainer).append('<label class="blankLabel" for=' + column.Name + '"Blank">(Blanks)</label>');
				$(filterContainer).append('<br />');
			}

			// Create value checkbox filters
			let index = 0;
			// Iterate on each value in column
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
							ColumnFilter.table.draw();
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