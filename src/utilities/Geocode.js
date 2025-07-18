import axios from "axios";

export const getCoordinatesFromAddress = async (address) => {
  const apiKey = process.env.OPENCAGE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OpenCage API key.");
  }

  // Force more specific Indian address context
  const fullAddress = `${address}, Uttar Pradesh, India`;
  const encodedAddress = encodeURIComponent(fullAddress);

  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodedAddress}&key=${apiKey}&countrycode=in&limit=1`;

  try {
    const response = await axios.get(url);
    const data = response.data;

    if (data.results && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry;
      return [lng, lat]; // [longitude, latitude]
    } else {
      throw new Error("Unable to geocode address. Please provide a more specific location.");
    }
  } catch (error) {
    console.error("Geocoding error:", error.message || error);
    throw new Error("Failed to fetch coordinates.");
  }
};
