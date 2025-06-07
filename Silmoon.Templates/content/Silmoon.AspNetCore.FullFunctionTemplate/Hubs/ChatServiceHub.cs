using Microsoft.AspNetCore.SignalR;
using Silmoon.AspNetCore.FullFunctionTemplate.Services;

namespace Silmoon.AspNetCore.FullFunctionTemplate.Hubs
{
    public class ChatServiceHub : Hub
    {
        private readonly ChatService _chatService;

        public ChatServiceHub(ChatService chatService)
        {
            _chatService = chatService;
        }

        public Task SendToMe(string message) => _chatService.SendToMe(Context.ConnectionId, message);

        public Task SendToAll(string message) => _chatService.SendToAll(Context.ConnectionId, message);

        public Task SendToUser(string username, string message) => _chatService.SendToUser(Context.ConnectionId, username, message);

        public Task UserSignIn(string username) => _chatService.UserSignIn(Context.ConnectionId, username);

        public Task UserSignOut(string username) => _chatService.UserSignOut(username);

        public override Task OnDisconnectedAsync(Exception? exception) => _chatService.HandleDisconnect(Context.ConnectionId);
    }
}
