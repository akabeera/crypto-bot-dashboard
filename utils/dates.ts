export function formatDate(epochTime: number): string {
    const date = new Date(epochTime);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

export function convertEpochToYYYYMMDD(timestamp: number): string {
    // Create a new date object from the epoch timestamp
    const date = new Date(timestamp);

    // Extract the year, month, and day
    const year = date.getUTCFullYear(); // Get the year as a four digit number (yyyy)
    const month = date.getUTCMonth() + 1; // Get the month as a number (0-11), add one to get (1-12)
    const day = date.getUTCDate(); // Get the day as a number (1-31)

    // Format the date components into a yyyyMMdd string
    // Ensure month and day are two digits by adding a leading zero if necessary
    const formattedDate = `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;

    return formattedDate;
}