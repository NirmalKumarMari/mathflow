export const SYLLABUS_TOPICS = [
  {
    id: "ratios",
    name: "Ratios",
    grades: ["6th", "7th"],
    subtopics: [
      "Basic Ratios", "Ratio Word Problems", "Equivalent Ratios",
      "Ratios on Coordinate Plane", "Part to Whole Ratios",
      "Proportional Relationships from Tables",
      "Proportional Relationships from Graphs",
      "Proportional Relationships from Equations",
      "Comparing Constants of Proportional Relationships"
    ],
    youtube_videos: ["HpdMJaKaXXc"]
  },
  {
    id: "rates_percentages",
    name: "Rates & Percentages",
    grades: ["6th", "7th"],
    subtopics: [
      "Introduction to Rates", "What Are Percentages?",
      "Percentages to Fractions", "Decimal Representation of Percentages",
      "Converting Between Percentage Forms", "Common Percentages",
      "Percentage Word Problems", "Tax and Tip Word Problems", "Fractions to Decimals"
    ],
    youtube_videos: ["e1Cd0XL5OEs"]
  },
  {
    id: "order_of_operations",
    name: "Order of Operations",
    grades: ["6th", "7th"],
    subtopics: [
      "Exponents", "Exponents with Negative Bases", "Zeroth Power",
      "Decimal Exponents", "Fractional Exponents", "PEMDAS"
    ],
    youtube_videos: ["ClYdw4d4OmA"]
  },
  {
    id: "negative_numbers",
    name: "Negative Numbers",
    grades: ["6th", "7th"],
    subtopics: [
      "Introduction to Negative Numbers", "Negative Symbol as Opposite",
      "Negative Decimals", "Negative Fractions",
      "Adding and Subtracting Negative Numbers",
      "Dividing and Multiplying Negative Numbers",
      "Ordering Negative Numbers", "Absolute Value"
    ],
    youtube_videos: ["u8UKdNdpkh4"]
  },
  {
    id: "variables_expressions",
    name: "Variables & Expressions",
    grades: ["6th", "7th"],
    subtopics: [
      "Coefficients", "Expressions with Variables",
      "Least Common Multiple", "Greatest Common Factor",
      "Algebraic Expression Word Problems", "Distributive Property",
      "Combining Like Terms", "Equivalent Expressions"
    ],
    youtube_videos: ["UvDcEvDC4vg"]
  },
  {
    id: "equations_inequalities",
    name: "Equations & Inequalities",
    grades: ["6th", "7th"],
    subtopics: [
      "Testing Solutions", "One-Step Equations (Addition & Subtraction)",
      "One-Step Equations (Multiplication & Division)",
      "Representing Relationships with Equations",
      "Inequalities with Variables", "Plotting Inequalities",
      "Two-Step Equations", "Two-Step Equations with Decimals and Fractions",
      "One-Step Inequalities", "Two-Step Inequalities"
    ],
    youtube_videos: ["jWpiMu5LNdg"]
  },
  {
    id: "statistics_probability",
    name: "Statistics & Probability",
    grades: ["6th", "7th"],
    subtopics: [
      "Representing Data", "Frequency Tables and Dot Plots", "Histograms",
      "Mean", "Median", "Mode", "Impact of Outliers on Mean and Median",
      "Interquartile Range", "Box Plots", "Mean Absolute Deviation",
      "Comparing Data Visualizations", "Theoretical Probability",
      "Experimental Probability", "Probability Models",
      "Making Predictions with Probabilities", "Compound Events",
      "Tree Diagrams", "Sample Spaces",
      "Comparing Distributions with Dot Plots",
      "Reasonable Samples and Valid Claims"
    ],
    youtube_videos: ["k3aKKasOmIw"]
  },
  {
    id: "coordinate_plane",
    name: "Coordinate Plane",
    grades: ["6th"],
    subtopics: [
      "Points on a Coordinate Plane", "Finding a Point on a Coordinate Plane",
      "Quadrants of a Coordinate Plane",
      "Drawing a Quadrilateral on a Coordinate Plane",
      "Finding the Area of a Parallelogram on a Coordinate Plane"
    ],
    youtube_videos: ["pAlq9fFwtus"]
  },
  {
    id: "basic_geometry",
    name: "Basic Geometry",
    grades: ["6th", "7th"],
    subtopics: [
      "Area of Parallelograms", "Height of a Parallelogram", "Area of Triangles",
      "Triangles with Missing Side Lengths", "Area of Composite Shapes",
      "Area of Quadrilaterals", "3D Shapes", "Counting Faces and Edges",
      "Volumes of Fractional Cubes", "Nets of a Polyhedron",
      "Surface Area Using Nets", "Surface Area vs Volume",
      "Radius, Diameter, and Pi", "Parts of a Circle", "Circumference",
      "Finding Circumference Given Area", "Area of a Circle",
      "Finding Area Given Circumference", "Arc Length",
      "Complementary and Supplementary Angles", "Vertical Angles",
      "Triangle Inequality Theorem", "Isosceles Triangles"
    ],
    youtube_videos: ["tFhBAeZVTMw"]
  },
  {
    id: "scale_copies",
    name: "Scale Copies",
    grades: ["7th"],
    subtopics: [
      "Identifying Scale Copies", "Identifying Scale Factors",
      "Scale Drawings", "Scale Factors and Area"
    ],
    youtube_videos: ["ZeY1mgog2YQ"]
  }
];

export const TOPIC_COLORS = {
  ratios: { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200" },
  rates_percentages: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
  order_of_operations: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
  negative_numbers: { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200" },
  variables_expressions: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  equations_inequalities: { bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-200" },
  statistics_probability: { bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-200" },
  coordinate_plane: { bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-200" },
  basic_geometry: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
  scale_copies: { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-200" },
};

export function getTopicById(id) {
  return SYLLABUS_TOPICS.find(t => t.id === id);
}

export function getTopicByName(name) {
  return SYLLABUS_TOPICS.find(t => t.name.toLowerCase() === name.toLowerCase());
}