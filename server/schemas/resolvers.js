const { User, Workouts } = require('../models');
const { signToken } = require("../utils/auth");
const { AuthenticationError } = require("apollo-server-express");

const resolvers = {
  Query: {
   getUser: async (parent, args, context) => {
      if (context.user) {
        const user = await User.findById({_id:context.user._id}).populate('savedWorkouts');
        return user;
      }
      throw new AuthenticationError('User not authenticated');
    },
    // listWorkouts: async (_, { userId }) => {
    //   const user = await User.findById(userId).populate('savedWorkouts');
    //   return user.savedWorkouts;
    // },
  },
  Mutation: {
    login: async (parent, { email, password }) => {
      const user = await User.findOne({ email });
      if (!user) {
        throw new AuthenticationError('Incorrect credentials');
      }
      const correctPw = await user.isCorrectPassword(password);
      if (!correctPw) {
        throw new AuthenticationError('Incorrect credentials');
    }    
      const token = signToken(user);
      return { token, user };
  },
    createUser: async (parent, args) => {
      const user = await User.create(args);
      const token = signToken(user);
      return { token, ...user.toObject()};
  },
    createWorkout: async (parent, { input }, context) => {
    
    if (!context.user) {
      throw new AuthenticationError('User not authenticated');
    }
    const workout = new Workouts({
      ...input,
    });
  
    await workout.save();

    await User.findByIdAndUpdate(
      {_id:context.user._id},
      { $push: { savedWorkouts: workout._id } },
      { new: true }
    );
    return workout;
  },

    updateWorkout: async (parent, { _id, input, type }, context) => {
    
      const updatedWorkout = await Workouts.findByIdAndUpdate(_id, input, { new: true });

    
      return updatedWorkout;
    },
    
    deleteWorkout: async (parent, { _id }, context) => {
      if (!context.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const existingWorkout = await Workouts.findById(_id);

      if (!existingWorkout) {
        throw new AuthenticationError('Workout was not found with this ID');
      }

      await User.findByIdAndUpdate(
        context.user._id,
        { $pull: { savedWorkouts: _id } },
        { new: true }
      );
      await Workouts.findByIdAndDelete(_id);

      return "Workout deleted successfully"; 
    },
},
};

module.exports = resolvers;