
$(document).ready(function() {
    // Initializes the DataTables table
    initializeTable(dataset);
});

/**
 * Initializes the Datatables table
 * Datatables site: https://datatables.net
 */
function initializeTable() {
    $('#datatable').DataTable( {
        data: dataset
        ,columns: [
            { title: "Name" }
            ,{ title: "Age" }
            ,{ title: "Job" }
        ]        
    });
}