import {
  IconAperture,
  IconBuilding,
  IconCopy,
  IconFolderOpen,
  IconLayoutDashboard,
  IconLogin,
  IconMoodHappy,
  IconSettings,
  IconTypography,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react";

import { uniqueId } from "lodash";

const Menuitems = [
  {
    navlabel: true,
    subheader: "HOME",
  },
  {
    id: uniqueId(),
    title: "Dashboard",
    icon: IconLayoutDashboard,
    href: "/",
  },
  {
    navlabel: true,
    subheader: "MANAGEMENT",
  },
  {
    id: uniqueId(),
    title: "Companies",
    icon: IconBuilding,
    href: "/companies",
  },
  {
    id: uniqueId(),
    title: "Users",
    icon: IconUsers,
    href: "/users",
  },
  {
    id: uniqueId(),
    title: "Projects",
    icon: IconFolderOpen,
    href: "/projects",
  },
];

export default Menuitems;
