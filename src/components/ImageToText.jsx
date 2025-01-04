import React, { useState } from "react";

const ImageToStructuredHTML = () => {
  const [image, setImage] = useState(null);
  const [progress, setProgress] = useState(0);
  const [dynamicHTML, setDynamicHTML] = useState("");

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result);
        setDynamicHTML("");
        setProgress(0);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!image) {
      alert("Please upload an image first.");
      return;
    }

    setProgress(10);

    try {
      const visionResponse = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${process.env.REACT_APP_GOOGLE_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [
              {
                image: { content: image.split(",")[1] },
                features: [{ type: "TEXT_DETECTION" }],
              },
            ],
          }),
        }
      );

      setProgress(40);

      const visionResult = await visionResponse.json();
      const extractedText =
        visionResult.responses[0]?.fullTextAnnotation?.text ||
        "No text detected.";

      const gptResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content:
                  "You are an expert in interpreting OCR text and creating structured HTML output. Use the provided OCR text and image to construct a meaningful, readable HTML table while preserving the original language.",
              },
              {
                role: "user",
                content: `OCR Text:\n\n${extractedText}\n\nInterpret this text and format it into a structured HTML table or sections.`,
              },
            ],
          }),
        }
      );

      setProgress(80);

      const gptResult = await gptResponse.json();
      const formattedHTML =
        gptResult.choices[0]?.message?.content || "No output generated.";

      setDynamicHTML(formattedHTML);
      setProgress(100);
    } catch (error) {
      console.error("Error processing image:", error);
      setProgress(0);
      setDynamicHTML("<p>An error occurred during processing.</p>");
    }
  };

  return (
    <div className="flex flex-col items-center p-6 bg-gray-100 min-h-screen">
      <h1 className="text-4xl font-bold text-blue-600 mb-6">
        Image to Structured HTML Converter
      </h1>
      <input
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="mb-6 px-4 py-2 border border-gray-300 rounded-lg bg-white shadow-sm"
      />
      <button
        onClick={processImage}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow hover:bg-blue-700"
      >
        Process Image
      </button>
      {progress > 0 && progress < 100 && (
        <p className="text-gray-700 mt-4">Progress: {progress}%</p>
      )}
      {dynamicHTML && (
        <div
          className="mt-6 bg-white p-4 rounded-lg shadow w-full max-w-4xl"
          dangerouslySetInnerHTML={{ __html: dynamicHTML }}
        ></div>
      )}
    </div>
  );
};

export default ImageToStructuredHTML;