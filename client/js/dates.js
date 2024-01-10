document.addEventListener("DOMContentLoaded", function() {
    // Get the current date
    var currentDate = new Date().toISOString().split('T')[0];

    // Calculate the date 20 days from now
    var maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 20);
    var maxDateString = maxDate.toISOString().split('T')[0];

    // Set the minimum and maximum date values
    document.getElementById("endEpochBorrow").setAttribute("value", currentDate);
    document.getElementById("endEpochBorrow").setAttribute("min", currentDate);
    document.getElementById("endEpochBorrow").setAttribute("max", maxDateString);
});

document.addEventListener("DOMContentLoaded", function() {
    // Add event listener for date input change
    document.getElementById("endEpochBorrow").addEventListener("change", function() {
        // Get the current date
        var currentDate = new Date();

        // Get the selected date
        var selectedDate = new Date(this.value);

        // Check if the date is valid
        if (!isNaN(selectedDate.getTime())) {
            
            // Calculate the difference in minutes
            var differenceInMinutes = Math.round((selectedDate - currentDate) / (1000 * 60));

            // Convert the difference into multiples of 5 minutes
            var expectedBorrowLength = Math.round(differenceInMinutes / 5);
            console.info("expectedBorrowLength", expectedBorrowLength);

            // Set the value in the hidden field
            document.getElementById("expectedBorrowLength").value = expectedBorrowLength;
        } else {
            // Handle invalid date input
            console.error("Invalid date input");
        }
    });
});