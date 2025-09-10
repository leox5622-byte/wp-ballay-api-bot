const axios = require("axios");

module.exports = {
  /**
   * Shortens a URL using is.gd API.
   * @param {string} longUrl - The full URL to shorten.
   * @returns {Promise<string|null>} Shortened URL or null if failed.
   */
  shortenURL: async function (longUrl) {
    if (!longUrl || typeof longUrl !== "string") return null;

    try {
      const response = await axios.get("https://is.gd/create.php", {
        params: { format: "simple", url: longUrl },
        timeout: 3000,
      });

      if (response.status === 200 && typeof response.data === "string") {
        return response.data.trim();
      }

      return null;
    } catch {
      return null;
    }
  }
};
