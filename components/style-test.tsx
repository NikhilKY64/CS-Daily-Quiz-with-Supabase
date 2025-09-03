'use client';

export function StyleTest() {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Style Test Component</h2>
      
      <div className="mb-6 p-4 border rounded-md">
        <p>This is a regular paragraph to test styling.</p>
        <p className="highlight">This is a highlighted paragraph.</p>
      </div>
      
      <div className="card-like mb-6">
        <p>This is a paragraph inside a card-like div.</p>
        <p>The card should have shadow and hover effects.</p>
      </div>
      
      <div className="mb-6 bg-gray-100 p-4 rounded-md">
        <p>This paragraph has custom styling from our CSS.</p>
        <p>It should be darker and more visible.</p>
      </div>
    </div>
  );
}