// Fixture mirroring GBC_Portfolio/data.js. Two known folders, one unknown.
const DATA = {
  about: { name: "Stephen Tse", title: "Game Programmer", bio: "Bio.", resume: "assets/resume.pdf", avatar: "assets/images/avatar.png" },
  projects: [
    {
      id: "project-1",
      category: "personal",
      name: "Personal Project - Coin Pusher Game",
      tagline: "Coin pusher game built with PlayCanvas and JavaScript.",
      description: "Touch and drop coins into the machine.",
      tech: ["PlayCanvas", "JavaScript"],
      photos: ["assets/images/coin_pusher/img1.png"]
    },
    {
      id: "project-2",
      category: "company",
      name: "MEGABOX × EMOJI \"YEAR OF THE SMILEY TIGER\"",
      tagline: "AR game at MegaBox.",
      description: "Scan the QR code and hunt emoji.",
      tech: ["PlayCanvas", "JavaScript"],
      photos: ["assets/images/emoji/img1.jpg", "assets/images/emoji/video1.mp4"]
    },
    {
      id: "project-99",
      category: "company",
      name: "A Brand New Activation With A Very Long Name Indeed",
      tagline: "Something new.",
      description: "Not in the curated map.",
      tech: ["Unity"],
      photos: ["assets/images/brand_new/img1.jpg"]
    }
  ],
  contact: { email: "stephenyctsedev@gmail.com", linkedin: "https://example.com/in/x", github: "https://example.com/x" }
};
