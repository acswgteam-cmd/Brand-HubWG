import React from 'react';
import {
  Palette,
  MediaImage,
  Ruler,
  Presentation,
  VideoCamera,
  OpenBook,
  Internet,
  Page,
  Folder,
  Building,
  Label,
  Calendar,
  Clock,
  Download,
  Plus,
  TransitionRight,
  CheckCircle,
  XmarkCircle,
  Mail,
  ChatBubble,
  WarningTriangle,
  LightBulb,
  Eye,
  Bookmark,
  Link,
  Lock,
  Cloud,
  PageEdit,
  Bell
} from 'iconoir-react';

export const getEmojiIcon = (emoji: string, className = "w-4 h-4 inline-block align-text-bottom") => {
  const props = { className };
  const cleanEmoji = emoji.trim().toLowerCase();
  switch (cleanEmoji) {
    // Asset Types / Formats
    case '🎨':
    case 'palette':
      return <Palette {...props} />;
    case '🖼️':
    case 'image':
    case 'media-image':
    case 'mediaimage':
      return <MediaImage {...props} />;
    case '📐':
    case 'ruler':
      return <Ruler {...props} />;
    case '📊':
    case 'presentation':
      return <Presentation {...props} />;
    case '🎥':
    case 'video':
    case 'videocamera':
      return <VideoCamera {...props} />;
    case '📖':
    case 'book':
    case 'openbook':
      return <OpenBook {...props} />;
    case '🌐':
    case 'internet':
      return <Internet {...props} />;
    case '📄':
    case 'page':
      return <Page {...props} />;
    case '📁':
    case 'folder':
      return <Folder {...props} />;
    
    // Statuses & Actions
    case '🕐':
    case '🕒':
    case 'clock':
      return <Clock {...props} />;
    case '📥':
    case 'download':
      return <Download {...props} />;
    case '➕':
    case 'plus':
      return <Plus {...props} />;
    case '🔄':
    case 'transition':
    case 'transitionright':
      return <TransitionRight {...props} />;
    case '✅':
    case 'check':
    case 'checkcircle':
      return <CheckCircle {...props} />;
    case '❌':
    case 'xmark':
    case 'xmarkcircle':
      return <XmarkCircle {...props} />;
    case '📭':
    case 'mail':
      return <Mail {...props} />;
    case '💬':
    case 'chat':
    case 'chatbubble':
      return <ChatBubble {...props} />;
    
    // Meta / Details
    case '🏢':
    case 'building':
      return <Building {...props} />;
    case '🏷️':
    case 'label':
      return <Label {...props} />;
    case '📅':
    case '🗓️':
    case 'calendar':
      return <Calendar {...props} />;
    case '🔖':
    case 'bookmark':
      return <Bookmark {...props} />;
    case '🔗':
    case 'link':
      return <Link {...props} />;
    case '💡':
    case 'lightbulb':
      return <LightBulb {...props} />;
    case '👁️':
    case 'eye':
      return <Eye {...props} />;
    case '✏️':
    case 'edit':
    case 'pageedit':
      return <PageEdit {...props} />;
    case '🔒':
    case 'lock':
      return <Lock {...props} />;
    case '☁️':
    case 'cloud':
      return <Cloud {...props} />;
    case '🚨':
    case '⚠️':
    case 'warning':
    case 'warningtriangle':
      return <WarningTriangle {...props} />;
    case 'bell':
    case '🔔':
      return <Bell {...props} />;
      
    default:
      return null;
  }
};
