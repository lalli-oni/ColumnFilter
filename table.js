
$(document).ready(function() {
    let dataset = prepareDataset(300);
    // Initializes the DataTables table with generated dataset
    initializeTable(dataset);
});

/**
 * Generate a number between 2 supplied number, inclusive.
 * @param {Number} min Minimum number generated
 * @param {Number} max Maximum number generated
 */
Math.randomBetween = function(min, max) {
    // A random integer between the min and max
    return Math.floor((Math.random() * max) + min);
}

/**
 * Generates a dataset for testing purposes
 * Concatenates First and Last names to Full Name
 * And Professions and titles to Job titles
 * Uses RNG for Age
 * @param {int} size Size of dataset
 * @return {Array} Generated dataset
 */
function prepareDataset(size) {
    let dataset = [];
    // Static data values for generation
    let firstNames = [ "Bob", "Frank", "Lucie", "Amanda", "Guybrush", "Zaphod", "Ford" ];
    let lastNames = [ "Smith", "Baker", "Johannsson", "Threpwood", "Beeblebrox", "Prefect" ];
    let professions = [ "Baker", "Developer", "Architect", "Toilet Diver", "Criminal" ];
    let titles = [ "Global", "Manager", "Assistant", ""]
    // Iterates as many times as the requested size of dataset
    for (let i = 0; i < size; i++) {
        let fullName = firstNames[i % firstNames.length] + " " + lastNames[i % lastNames.length];
        let age = Math.randomBetween(18, 50);
        let jobTitle = titles[i % titles.length] + " " + professions[i % professions.length];
        dataset.push([fullName, age, jobTitle]);
    }
    return dataset; 
}

/**
 * Initializes the Datatables table
 * Datatables site: https://datatables.net
 * @param {Array} dataset The dataset used to populate the table 
 */
function initializeTable(dataset) {
    $('#datatable').DataTable( {
        data: dataset
        ,columns: [
            { title: "Name" }
            ,{ title: "Age" }
            ,{ title: "Job" }
        ]        
    });
}