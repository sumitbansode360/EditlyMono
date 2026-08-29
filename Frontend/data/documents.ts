interface MockDocument {
  id: string;
  title: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

export const documents: MockDocument[] = [
  {
    id: "1",
    title: "Project Requirements",
    owner: "Sumit",
    createdAt: "May 10, 2026",
    updatedAt: "2 hours ago",
  },
  {
    id: "2",
    title: "Meeting Notes",
    owner: "Rahul",
    createdAt: "May 8, 2026",
    updatedAt: "Yesterday",
  },
  {
    id: "3",
    title: "Product Roadmap",
    owner: "Amit",
    createdAt: "May 1, 2026",
    updatedAt: "3 days ago",
  },
  {
    id: "4",
    title: "Hiring Plan",
    owner: "Priya",
    createdAt: "April 28, 2026",
    updatedAt: "1 week ago",
  }
];