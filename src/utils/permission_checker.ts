import { ChatInputCommandInteraction, PermissionsBitField, GuildMember } from 'discord.js';

export const checkPermission = (interaction: ChatInputCommandInteraction): boolean =>
{
  const botMember = interaction.guild?.members.me as GuildMember;

  // 메시지 전송 권한 확인
  if (!botMember.permissionsIn(interaction.channel!.id).has(PermissionsBitField.Flags.SendMessages))
  {
    interaction.reply({
      content: `\`\`\`🔸 이 채널에 메시지를 보낼 권한이 없습니다.😥\n봇에게 필요한 권한을 부여하거나 서버 관리자에게 봇을 추방하고 다시 초대하도록 요청해보세요.\`\`\``,
      ephemeral: true,
    });
    return false;
  }

  // 채널 보기 권한 확인
  if (!botMember.permissionsIn(interaction.channel!.id).has(PermissionsBitField.Flags.ViewChannel))
  {
    interaction.reply({
      content: `\`\`\`🔸 이 채널의 속성을 확인할 수 있는 권한이 없습니다.😥\n봇에게 필요한 권한을 부여하거나 서버 관리자에게 봇을 추방하고 다시 초대하도록 요청해보세요.\`\`\``,
      ephemeral: true,
    });
    return false;
  }

  // 음성 채널 연결 권한 확인
  const voiceChannel = (interaction.member as GuildMember)?.voice.channel;
  if (voiceChannel && !botMember.permissionsIn(voiceChannel.id).has(PermissionsBitField.Flags.Connect))
  {
    interaction.reply({
      content: `\`\`\`🔸 음성 채널에 연결할 권한이 없습니다.😥\n봇에게 필요한 권한을 부여하거나 서버 관리자에게 봇을 추방하고 다시 초대하도록 요청해보세요.\`\`\``,
      ephemeral: true,
    });
    return false;
  }

  return true;
};

export default checkPermission;
